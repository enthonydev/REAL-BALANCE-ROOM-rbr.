import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, signInWithEmailAndPassword } from "firebase/auth";
import { ArrowRight, Check, Mail, ShieldCheck } from "lucide-react";
import { auth, firebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export default function Auth() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.emailVerified) navigate("/");
  }, [navigate, user]);
  if (user?.emailVerified) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!auth) { setError("O Firebase ainda não foi configurado neste ambiente."); return; }
    try {
      if (mode === "register") {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await sendEmailVerification(result.user);
        setMessage("Conta criada. Verifique seu e-mail para liberar o acesso.");
      } else {
        const result = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (!result.user.emailVerified) { setMessage("Verifique seu e-mail antes de entrar no RBR."); return; }
        navigate("/");
      }
    } catch { setError("Não foi possível concluir o acesso. Confira os dados e tente novamente."); }
  };

  const resetPassword = async () => {
    if (!auth) { setError("O Firebase ainda não foi configurado neste ambiente."); return; }
    try { await sendPasswordResetEmail(auth, email.trim()); setMessage("Se o e-mail existir, você receberá as instruções de recuperação."); }
    catch { setError("Informe um e-mail válido para recuperar a senha."); }
  };

  return <main className="auth-page"><section className="auth-panel"><div className="brand-mark" aria-label="RBR"><span>R</span><span>B</span><span>R</span></div><span className="section-kicker">RBR · FINANCIAMENTO</span><h1>{mode === "login" ? "Acesse seu planejamento." : "Crie seu espaço financeiro."}</h1><p className="auth-intro">Seus financiamentos ficam separados por conta e protegidos por verificação de e-mail.</p>{!firebaseConfigured && <div className="auth-warning">Configure as variáveis `VITE_FIREBASE_*` para habilitar o acesso neste ambiente.</div>}<form onSubmit={submit}><label className="field"><span>E-mail</span><div className="input-wrap"><Mail size={15} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></label><label className="field"><span>Senha</span><div className="input-wrap"><ShieldCheck size={15} /><input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></div></label>{error && <p className="field-error">{error}</p>}{message && <p className="auth-message"><Check size={14} />{message}</p>}<button className="primary-button full" type="submit">{mode === "login" ? "Entrar" : "Criar conta"}<ArrowRight size={16} /></button></form>{mode === "login" && <button className="text-button auth-reset" onClick={resetPassword}>Esqueci minha senha</button>}<div className="auth-switch">{mode === "login" ? "Ainda não possui conta?" : "Já possui uma conta?"}<button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); setMessage(null); }}>{mode === "login" ? "Criar conta" : "Entrar"}</button></div><Link href="/" className="auth-back">Voltar para a apresentação</Link></section></main>;
}
