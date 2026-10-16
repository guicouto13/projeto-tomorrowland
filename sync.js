const status = document.getElementById("sync-status");
const form = document.getElementById("sync-form");
const logoutButton = document.getElementById("sync-logout");
const config = window.TOMORROWLAND_FIREBASE_CONFIG;
const appData = window.tomorrowlandApp;

if (!config || !config.apiKey || !config.projectId || !config.appId || !appData) {
  status.textContent = "A sincronização ainda precisa ser conectada ao Firebase. Seus registros continuam salvos neste aparelho.";
} else {
  startSync().catch(() => {
    status.textContent = "Não foi possível iniciar a sincronização. Seus registros continuam salvos neste aparelho.";
  });
}

async function startSync() {
  const [{ initializeApp }, authLib, storeLib] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js")
  ]);
  const firebaseApp = initializeApp(config);
  const auth = authLib.getAuth(firebaseApp);
  const db = storeLib.getFirestore(firebaseApp);
  let user = null;
  let running = false;
  let rerun = false;
  const ownerKey = "projeto-tomorrowland-sync-owner";
  const dateOk = key => /^\d{4}-\d{2}-\d{2}$/.test(key);
  const hasMeals = record => record && record.meals && Object.values(record.meals).some(meal => meal && meal.saved);
  const versionOf = (key, snapshot) => snapshot.dayVersions[key] || (hasMeals(snapshot.records[key]) ? Object.values(snapshot.records[key].meals).map(meal => meal?.saved?.savedAt || "").sort().at(-1) || "1970-01-01T00:00:00.000Z" : "");
  const dayRef = (uid, key) => storeLib.doc(db, "users", uid, "days", key);
  const runRef = uid => storeLib.doc(db, "users", uid, "state", "runs");
  const setStatus = message => { status.textContent = message; };

  async function syncNow() {
    if (!user) return;
    if (running) { rerun = true; return; }
    running = true;
    setStatus("Sincronizando histórico e treino...");
    try {
      const uid = user.uid;
      const remoteDays = await storeLib.getDocs(storeLib.collection(db, "users", uid, "days"));
      const remote = new Map(remoteDays.docs.filter(item => dateOk(item.id)).map(item => [item.id, item.data()]));
      const local = appData.snapshot();
      const keys = new Set([...remote.keys(), ...Object.keys(local.records), ...Object.keys(local.dayVersions)]);
      for (const key of keys) {
        if (!dateOk(key)) continue;
        const cloud = remote.get(key);
        const current = appData.snapshot();
        const localVersion = versionOf(key, current);
        const cloudVersion = typeof cloud?.updatedAt === "string" ? cloud.updatedAt : "";
        if (cloudVersion > localVersion) appData.receiveDay(key, cloud);
        else if (localVersion && localVersion > cloudVersion) {
          const record = current.records[key];
          await storeLib.setDoc(dayRef(uid, key), { updatedAt: localVersion, deleted: !hasMeals(record), ...(hasMeals(record) ? { record } : {}) });
        }
      }
      const cloudRunsSnapshot = await storeLib.getDoc(runRef(uid));
      const cloudRuns = cloudRunsSnapshot.exists() ? cloudRunsSnapshot.data() : null;
      const current = appData.snapshot();
      const localRunsVersion = current.runsVersion || (current.runs.flat().some(Boolean) ? "1970-01-01T00:00:00.000Z" : "");
      const cloudRunsVersion = typeof cloudRuns?.updatedAt === "string" ? cloudRuns.updatedAt : "";
      if (cloudRunsVersion > localRunsVersion) appData.receiveRuns(cloudRuns);
      else if (localRunsVersion && localRunsVersion > cloudRunsVersion) await storeLib.setDoc(runRef(uid), { updatedAt: localRunsVersion, runs: current.runs });
      setStatus(`Sincronizado com ${user.email || "sua conta"}. Seus dados também ficam disponíveis neste aparelho.`);
    } catch (error) {
      setStatus(error?.code === "permission-denied" ? "Acesso negado pelo Firebase. Confira as regras do Firestore." : "Sem conexão com a nuvem agora. Seus registros continuam salvos neste aparelho e serão enviados ao reconectar.");
    } finally {
      running = false;
      if (rerun) { rerun = false; syncNow(); }
    }
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const email = document.getElementById("sync-email").value.trim();
    const password = document.getElementById("sync-password").value;
    setStatus("Entrando...");
    try { await authLib.signInWithEmailAndPassword(auth, email, password); }
    catch (error) { setStatus(error?.code === "auth/invalid-credential" ? "E-mail ou senha incorretos." : "Não foi possível entrar. Confira os dados e a conexão."); }
    finally { document.getElementById("sync-password").value = ""; }
  });
  document.getElementById("sync-create").addEventListener("click", async () => {
    if (!form.reportValidity()) return;
    const email = document.getElementById("sync-email").value.trim();
    const password = document.getElementById("sync-password").value;
    setStatus("Criando conta...");
    try { await authLib.createUserWithEmailAndPassword(auth, email, password); }
    catch (error) { setStatus(error?.code === "auth/email-already-in-use" ? "Esse e-mail já tem conta. Use Entrar." : error?.code === "auth/weak-password" ? "Escolha uma senha mais forte." : "Não foi possível criar a conta. Confira os dados e a conexão."); }
    finally { document.getElementById("sync-password").value = ""; }
  });
  logoutButton.addEventListener("click", () => authLib.signOut(auth));
  authLib.onAuthStateChanged(auth, async nextUser => {
    user = nextUser;
    form.hidden = Boolean(user);
    logoutButton.hidden = !user;
    if (!user) { setStatus("Entre para sincronizar automaticamente o histórico e o treino entre aparelhos."); return; }
    const owner = localStorage.getItem(ownerKey);
    if (owner && owner !== user.uid) {
      await authLib.signOut(auth);
      setStatus("Este aparelho tem dados vinculados a outra conta. Exporte um backup antes de trocar de conta.");
      return;
    }
    localStorage.setItem(ownerKey, user.uid);
    syncNow();
  });
  window.addEventListener("tomorrowland-change", syncNow);
  window.addEventListener("online", syncNow);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) syncNow(); });
  setInterval(() => { if (!document.hidden) syncNow(); }, 120000);
}
