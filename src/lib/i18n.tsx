"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type LangCode =
  | "en"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "zh"
  | "ja"
  | "ar"
  | "bg"
  | "ru";

/** Selector labels always in English */
export const LANGUAGE_OPTIONS: { code: LangCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ar", label: "Arabic" },
  { code: "bg", label: "Bulgarian" },
  { code: "ru", label: "Russian" },
];

type Dict = Record<string, string>;

const en: Dict = {
  home: "Home",
  explore: "Explore",
  notifications: "Notifications",
  alerts: "Alerts",
  messages: "Messages",
  inbox: "Inbox",
  bookmarks: "Bookmarks",
  saved: "Saved",
  profile: "Profile",
  more: "More",
  music: "Music",
  tunes: "Tunes",
  verify: "Verify",
  social: "Social",
  out: "Out",
  signIn: "Sign in",
  signUp: "Sign up",
  signOut: "Sign out",
  email: "Email",
  password: "Password",
  continue: "Sign in to continue",
  forgotPassword: "Forgot password?",
  resetPassword: "Reset your password",
  sendReset: "Send reset link",
  backToSignIn: "Back to sign in",
  createAccount: "Create your account",
  language: "Language",
  languageHint: "Choose your language. The Language label stays in English.",
  save: "Save",
  cancel: "Cancel",
  following: "Following",
  followers: "Followers",
  friends: "Friends",
  enlightenments: "Enlightenments",
  forYou: "For you",
  followingTab: "Following",
  search: "Search",
  whoToFollow: "Who to follow",
  trends: "Trends for you",
  letMeEnlighten: "Let me enlighten you...",
  enlightenEveryone: "Enlighten every one",
  backHome: "Back home",
  editProfile: "Edit profile",
  settings: "Settings",
  interests: "Your interests",
  interestsHint: "Pick topics you care about. We match you with people who share them.",
  saveInterests: "Save interests",
  matchedForYou: "Matched for you",
  noMessages: "No messages yet",
  loading: "Loading…",
  welcome: "Welcome to Lumen",
};

const es: Dict = {
  ...en,
  home: "Inicio",
  explore: "Explorar",
  notifications: "Notificaciones",
  alerts: "Alertas",
  messages: "Mensajes",
  inbox: "Bandeja",
  bookmarks: "Guardados",
  saved: "Guardados",
  profile: "Perfil",
  more: "Más",
  music: "Música",
  tunes: "Música",
  verify: "Verificar",
  social: "Social",
  out: "Salir",
  signIn: "Iniciar sesión",
  signUp: "Registrarse",
  signOut: "Cerrar sesión",
  email: "Correo",
  password: "Contraseña",
  continue: "Inicia sesión para continuar",
  forgotPassword: "¿Olvidaste tu contraseña?",
  resetPassword: "Restablecer contraseña",
  sendReset: "Enviar enlace",
  backToSignIn: "Volver a iniciar sesión",
  createAccount: "Crea tu cuenta",
  language: "Language",
  languageHint: "Elige tu idioma. La etiqueta Language permanece en inglés.",
  save: "Guardar",
  cancel: "Cancelar",
  following: "Siguiendo",
  followers: "Seguidores",
  friends: "Amigos",
  enlightenments: "Iluminaciones",
  forYou: "Para ti",
  followingTab: "Siguiendo",
  search: "Buscar",
  whoToFollow: "A quién seguir",
  trends: "Tendencias",
  letMeEnlighten: "Déjame iluminarte...",
  enlightenEveryone: "Iluminar a todos",
  backHome: "Volver al inicio",
  editProfile: "Editar perfil",
  settings: "Ajustes",
  interests: "Tus intereses",
  interestsHint: "Elige temas. Te conectamos con personas afines.",
  saveInterests: "Guardar intereses",
  matchedForYou: "Para ti",
  noMessages: "Aún no hay mensajes",
  loading: "Cargando…",
  welcome: "Bienvenido a Lumen",
};

const fr: Dict = {
  ...en,
  home: "Accueil",
  explore: "Explorer",
  notifications: "Notifications",
  alerts: "Alertes",
  messages: "Messages",
  inbox: "Boîte",
  bookmarks: "Signets",
  saved: "Enregistrés",
  profile: "Profil",
  more: "Plus",
  music: "Musique",
  tunes: "Musique",
  verify: "Vérifier",
  social: "Social",
  out: "Sortir",
  signIn: "Connexion",
  signUp: "S’inscrire",
  signOut: "Déconnexion",
  email: "E-mail",
  password: "Mot de passe",
  continue: "Connectez-vous pour continuer",
  forgotPassword: "Mot de passe oublié ?",
  resetPassword: "Réinitialiser le mot de passe",
  sendReset: "Envoyer le lien",
  backToSignIn: "Retour à la connexion",
  createAccount: "Créer un compte",
  language: "Language",
  languageHint: "Choisissez votre langue. Le libellé Language reste en anglais.",
  save: "Enregistrer",
  cancel: "Annuler",
  following: "Abonnements",
  followers: "Abonnés",
  friends: "Amis",
  enlightenments: "Éclairages",
  forYou: "Pour vous",
  followingTab: "Abonnements",
  search: "Rechercher",
  whoToFollow: "À suivre",
  trends: "Tendances",
  letMeEnlighten: "Laissez-moi vous éclairer...",
  enlightenEveryone: "Éclairer tout le monde",
  backHome: "Retour à l’accueil",
  editProfile: "Modifier le profil",
  interests: "Vos centres d’intérêt",
  saveInterests: "Enregistrer",
  matchedForYou: "Pour vous",
  noMessages: "Pas encore de messages",
  loading: "Chargement…",
  welcome: "Bienvenue sur Lumen",
};

const de: Dict = {
  ...en,
  home: "Start",
  explore: "Entdecken",
  notifications: "Mitteilungen",
  alerts: "Alerts",
  messages: "Nachrichten",
  inbox: "Posteingang",
  bookmarks: "Lesezeichen",
  saved: "Gespeichert",
  profile: "Profil",
  more: "Mehr",
  music: "Musik",
  tunes: "Musik",
  verify: "Verifizieren",
  out: "Raus",
  signIn: "Anmelden",
  signUp: "Registrieren",
  signOut: "Abmelden",
  email: "E-Mail",
  password: "Passwort",
  continue: "Anmelden, um fortzufahren",
  forgotPassword: "Passwort vergessen?",
  language: "Language",
  save: "Speichern",
  cancel: "Abbrechen",
  following: "Folge ich",
  followers: "Follower",
  friends: "Freunde",
  forYou: "Für dich",
  letMeEnlighten: "Lass dich erleuchten...",
  enlightenEveryone: "Alle erleuchten",
  backHome: "Zurück",
  loading: "Laden…",
  welcome: "Willkommen bei Lumen",
};

const pt: Dict = {
  ...en,
  home: "Início",
  explore: "Explorar",
  notifications: "Notificações",
  alerts: "Alertas",
  messages: "Mensagens",
  inbox: "Caixa",
  bookmarks: "Salvos",
  saved: "Salvos",
  profile: "Perfil",
  more: "Mais",
  music: "Música",
  verify: "Verificar",
  out: "Sair",
  signIn: "Entrar",
  signUp: "Cadastrar",
  signOut: "Sair",
  email: "E-mail",
  password: "Senha",
  continue: "Entre para continuar",
  language: "Language",
  save: "Salvar",
  cancel: "Cancelar",
  following: "Seguindo",
  followers: "Seguidores",
  friends: "Amigos",
  forYou: "Para você",
  letMeEnlighten: "Deixe-me iluminar você...",
  enlightenEveryone: "Iluminar a todos",
  loading: "Carregando…",
  welcome: "Bem-vindo ao Lumen",
};

const zh: Dict = {
  ...en,
  home: "首页",
  explore: "探索",
  notifications: "通知",
  alerts: "提醒",
  messages: "私信",
  inbox: "收件箱",
  bookmarks: "书签",
  saved: "已保存",
  profile: "个人资料",
  more: "更多",
  music: "音乐",
  tunes: "音乐",
  verify: "认证",
  out: "退出",
  signIn: "登录",
  signUp: "注册",
  signOut: "退出登录",
  email: "邮箱",
  password: "密码",
  continue: "登录以继续",
  language: "Language",
  save: "保存",
  cancel: "取消",
  following: "正在关注",
  followers: "关注者",
  friends: "好友",
  forYou: "推荐",
  letMeEnlighten: "让我启发你...",
  enlightenEveryone: "启发所有人",
  loading: "加载中…",
  welcome: "欢迎来到 Lumen",
};

const ja: Dict = {
  ...en,
  home: "ホーム",
  explore: "見つける",
  notifications: "通知",
  alerts: "アラート",
  messages: "メッセージ",
  inbox: "受信箱",
  bookmarks: "ブックマーク",
  saved: "保存済み",
  profile: "プロフィール",
  more: "もっと見る",
  music: "音楽",
  verify: "認証",
  out: "ログアウト",
  signIn: "ログイン",
  signUp: "登録",
  signOut: "ログアウト",
  email: "メール",
  password: "パスワード",
  continue: "続行するにはログイン",
  language: "Language",
  save: "保存",
  cancel: "キャンセル",
  following: "フォロー中",
  followers: "フォロワー",
  friends: "友達",
  forYou: "おすすめ",
  letMeEnlighten: "啓発しましょう...",
  enlightenEveryone: "みんなを啓発",
  loading: "読み込み中…",
  welcome: "Lumenへようこそ",
};

const ar: Dict = {
  ...en,
  home: "الرئيسية",
  explore: "استكشاف",
  notifications: "الإشعارات",
  alerts: "تنبيهات",
  messages: "الرسائل",
  inbox: "الوارد",
  bookmarks: "المحفوظات",
  saved: "محفوظ",
  profile: "الملف",
  more: "المزيد",
  music: "الموسيقى",
  verify: "توثيق",
  out: "خروج",
  signIn: "تسجيل الدخول",
  signUp: "إنشاء حساب",
  signOut: "تسجيل الخروج",
  email: "البريد",
  password: "كلمة المرور",
  continue: "سجّل الدخول للمتابعة",
  language: "Language",
  save: "حفظ",
  cancel: "إلغاء",
  following: "متابَعون",
  followers: "المتابعون",
  friends: "الأصدقاء",
  forYou: "لك",
  letMeEnlighten: "دعني أنير لك...",
  enlightenEveryone: "أنر الجميع",
  loading: "جاري التحميل…",
  welcome: "مرحباً بك في Lumen",
};

const bg: Dict = {
  ...en,
  home: "Начало",
  explore: "Открий",
  notifications: "Известия",
  alerts: "Сигнали",
  messages: "Съобщения",
  inbox: "Входящи",
  bookmarks: "Отметки",
  saved: "Запазени",
  profile: "Профил",
  more: "Още",
  music: "Музика",
  tunes: "Музика",
  verify: "Верификация",
  out: "Изход",
  signIn: "Вход",
  signUp: "Регистрация",
  signOut: "Изход",
  email: "Имейл",
  password: "Парола",
  continue: "Влезте, за да продължите",
  forgotPassword: "Забравена парола?",
  language: "Language",
  languageHint: "Изберете език. Етикетът Language остава на английски.",
  save: "Запази",
  cancel: "Отказ",
  following: "Следва",
  followers: "Последователи",
  friends: "Приятели",
  enlightenments: "Просветления",
  forYou: "За теб",
  letMeEnlighten: "Нека те просветля...",
  enlightenEveryone: "Просвети всички",
  backHome: "Начало",
  editProfile: "Редактирай профил",
  interests: "Твоите интереси",
  saveInterests: "Запази интереси",
  matchedForYou: "Подбрани за теб",
  noMessages: "Все още няма съобщения",
  loading: "Зареждане…",
  welcome: "Добре дошли в Lumen",
};

const ru: Dict = {
  ...en,
  home: "Главная",
  explore: "Обзор",
  notifications: "Уведомления",
  alerts: "Оповещения",
  messages: "Сообщения",
  inbox: "Входящие",
  bookmarks: "Закладки",
  saved: "Сохранённое",
  profile: "Профиль",
  more: "Ещё",
  music: "Музыка",
  verify: "Проверка",
  out: "Выйти",
  signIn: "Войти",
  signUp: "Регистрация",
  signOut: "Выйти",
  email: "Эл. почта",
  password: "Пароль",
  continue: "Войдите, чтобы продолжить",
  language: "Language",
  save: "Сохранить",
  cancel: "Отмена",
  following: "Подписки",
  followers: "Подписчики",
  friends: "Друзья",
  forYou: "Для вас",
  letMeEnlighten: "Позвольте вдохновить вас...",
  enlightenEveryone: "Вдохновить всех",
  loading: "Загрузка…",
  welcome: "Добро пожаловать в Lumen",
};

const TABLES: Record<LangCode, Dict> = {
  en,
  es,
  fr,
  de,
  pt,
  zh,
  ja,
  ar,
  bg,
  ru,
};

type I18nCtx = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string) => string;
};

const Ctx = createContext<I18nCtx | null>(null);
const STORAGE_KEY = "lumen_lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LangCode | null;
      if (saved && TABLES[saved]) setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
  }, [lang]);

  const setLang = (l: LangCode) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  };

  const t = useMemo(() => {
    const table = TABLES[lang] || en;
    return (key: string) => table[key] || en[key] || key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      lang: "en" as LangCode,
      setLang: (_: LangCode) => {},
      t: (key: string) => en[key] || key,
    };
  }
  return ctx;
}
