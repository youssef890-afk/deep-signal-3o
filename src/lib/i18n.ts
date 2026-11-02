import { isAvailableLanguageCode, type AvailableLanguage } from '@/i18n/languages';

export type Language = AvailableLanguage;
export type TextDirection = 'rtl' | 'ltr';

const messages = {
  ar: {
    title: 'الإعدادات', back: 'رجوع', account: 'الحساب', privacy: 'الخصوصية', security: 'الأمان', notifications: 'الإشعارات', appearance: 'المظهر', language: 'اللغة', content: 'المحتوى', accessibility: 'إمكانية الوصول', data: 'البيانات', about: 'حول',
    accountDetails: 'معلومات الحساب', changePhoto: 'تغيير الصورة', fullName: 'الاسم الكامل', username: 'اسم المستخدم', email: 'البريد الإلكتروني', phone: 'رقم الهاتف', bio: 'نبذة تعريفية', saveChanges: 'حفظ التغييرات', saving: 'جارٍ الحفظ...', saved: 'تم الحفظ', saveError: 'مشكل فالحفظ، عاود جرب',
    localNotice: 'إعدادات الخصوصية والإشعارات هنا محفوظة على هذا الجهاز فقط، ولا تغيّر صلاحيات قاعدة البيانات.', privateAccount: 'حساب خاص', privateAccountDesc: 'تحكم في من يمكنه مشاهدة منشوراتك', whoCanMessage: 'من يستطيع إرسال رسائل', everyone: 'الجميع', followers: 'المتابعون', nobody: 'لا أحد', showEmail: 'إظهار البريد الإلكتروني', showEmailDesc: 'السماح بعرض بريدك في ملفك', showLastSeen: 'إظهار آخر ظهور', showLastSeenDesc: 'السماح للآخرين بمعرفة وقت نشاطك', archivedPosts: 'المنشورات المؤرشفة', manage: 'إدارة',
    changePassword: 'تغيير كلمة المرور', twoFactor: 'التحقق بخطوتين', twoFactorDesc: 'تفضيل محفوظ محلياً؛ التفعيل الأمني يحتاج إعداداً من مزود المصادقة', activeDevices: 'الأجهزة النشطة', thisDevice: 'هذا الجهاز', currentSession: 'الجلسة الحالية', signOutAll: 'تسجيل الخروج من كل الأجهزة', signedOut: 'تم تسجيل الخروج من الجلسات الأخرى', currentPassword: 'كلمة المرور الحالية', newPassword: 'كلمة المرور الجديدة', confirmPassword: 'تأكيد كلمة المرور', passwordMismatch: 'كلمتا المرور غير متطابقتين', passwordChanged: 'تم تحديث كلمة المرور', updatePassword: 'تحديث كلمة المرور', cancel: 'إلغاء',
    postNotifications: 'إشعارات المنشورات', likes: 'الإعجابات', comments: 'التعليقات', newFollows: 'المتابعات الجديدة', messages: 'الرسائل', sound: 'الأصوات', vibration: 'الاهتزاز',
    theme: 'سمة التطبيق', light: 'فاتح', dark: 'غامق', auto: 'تلقائي', accent: 'لون التطبيق الأساسي', fontSize: 'حجم الخط', density: 'كثافة الواجهة', comfortable: 'مريح', compact: 'مضغوط',
    arabic: 'العربية', french: 'Français', english: 'English', languageSaved: 'تم حفظ اللغة',
    blockedWords: 'الكلمات المحجوبة', addWord: 'أضف كلمة', blockedAccounts: 'الحسابات المحجوبة', noBlockedAccounts: 'ما كايناش حسابات محجوبة', remove: 'إزالة', commentFilter: 'تصفية التعليقات', normal: 'عادي', strict: 'صارم',
    reduceMotion: 'تقليل الحركة', highContrast: 'تباين عالي', screenReader: 'تحسينات قارئ الشاشة', autoTranslate: 'الترجمة التلقائية',
    downloadData: 'تحميل نسخة من بياناتي', deleteAccount: 'حذف الحساب', deleteWarning: 'حذف الحساب نهائي ولا يمكن التراجع عنه. هاد الواجهة ما عندهاش صلاحية حذف حساب المصادقة مباشرة.', typeDelete: 'اكتب DELETE للتأكيد', deleteConfirm: 'تأكيد الطلب', deleteUnavailable: 'ما تم حذف الحساب. تواصل مع الدعم لإتمام طلب الحذف بأمان.',
    version: 'الإصدار', terms: 'الشروط والأحكام', privacyPolicy: 'سياسة الخصوصية', contact: 'اتصل بنا', rateApp: 'تقييم التطبيق', unavailable: 'هاد الخدمة مازال ما مفعّلاش.',
    profileSaved: 'تم حفظ التغييرات', avatarError: 'تعذر تغيير الصورة', retry: 'إعادة المحاولة', loading: 'جارٍ تحميل الإعدادات', wordExists: 'هاد الكلمة موجودة من قبل', add: 'إضافة', currentDevice: 'المتصفح الحالي', deleteModalTitle: 'تأكيد حذف الحساب', passwordModalTitle: 'تغيير كلمة المرور', emailUpdateNote: 'قد يطلب تحديث البريد تأكيداً عبر البريد الإلكتروني.',
    closeDialog: 'إغلاق النافذة', profileLoading: 'جارٍ تحميل الملف الشخصي...', profileNotFound: 'هذا الملف الشخصي غير موجود أو لم يعد متاحاً.', profileLoadError: 'تعذر تحميل الملف الشخصي. تحقق من اتصالك ثم أعد المحاولة.', profileSignInRequired: 'سجّل الدخول لعرض ملفك الشخصي.', errorTitle: 'حدث خطأ تقني غير متوقع.', errorDescription: 'تعذر عرض هذه الصفحة. أعد تحميلها أو ارجع إلى الصفحة الرئيسية.', reloadPage: 'إعادة التحميل', returnHome: 'العودة إلى الرئيسية',
    directMessages: 'المحادثات', privateConversation: 'محادثة خاصة', waitingSignal: 'هناك رسالة بانتظارك', signalProfile: 'الملف الشخصي', liveCall: 'مكالمة مباشرة',
    searchPageTitle: 'البحث', searchPlaceholder: 'ابحث عن اسم المستخدم أو المعرّف...', searchClear: 'مسح البحث', searchError: 'تعذر جلب النتائج. حاول مرة أخرى.', searchNoResults: 'لا توجد نتائج مطابقة',
    voicePermissionDenied: 'لم يُسمح باستخدام الميكروفون. تحقق من إذن الموقع ثم حاول مجدداً.', microphoneUnavailable: 'الميكروفون غير متاح. تحقق من توصيله أو من دعم المتصفح.', microphoneBusy: 'الميكروفون مستخدم من تطبيق آخر. أغلق التطبيق ثم حاول مجدداً.', microphoneSecureContext: 'يلزم فتح الموقع عبر اتصال آمن لاستخدام الميكروفون.', voiceUploadError: 'تعذر إرسال الرسالة الصوتية. تحقق من الاتصال وإذن الميكروفون ثم حاول مجدداً.', voicePlaybackError: 'تعذر تشغيل الرسالة الصوتية.', voiceLoading: 'جارٍ تحميل التسجيل...', ideaPlanner: 'مخطط الأفكار', ideaPlannerThinking: 'جارٍ إعداد التصور',
  },
  fr: {
    title: 'Paramètres', back: 'Retour', account: 'Compte', privacy: 'Confidentialité', security: 'Sécurité', notifications: 'Notifications', appearance: 'Apparence', language: 'Langue', content: 'Contenu', accessibility: 'Accessibilité', data: 'Données', about: 'À propos',
    accountDetails: 'Informations du compte', changePhoto: 'Changer la photo', fullName: 'Nom complet', username: "Nom d'utilisateur", email: 'Adresse e-mail', phone: 'Téléphone', bio: 'Biographie', saveChanges: 'Enregistrer les modifications', saving: 'Enregistrement...', saved: 'Enregistré', saveError: "Problème d'enregistrement, réessayez",
    localNotice: "Les paramètres de confidentialité et de notifications sont enregistrés sur cet appareil uniquement et ne modifient pas les autorisations de la base de données.", privateAccount: 'Compte privé', privateAccountDesc: 'Choisissez qui peut voir vos publications', whoCanMessage: 'Qui peut vous envoyer des messages', everyone: 'Tout le monde', followers: 'Abonnés', nobody: 'Personne', showEmail: "Afficher l'adresse e-mail", showEmailDesc: "Autoriser l'affichage de votre e-mail sur votre profil", showLastSeen: 'Afficher la dernière présence', showLastSeenDesc: "Autoriser les autres à voir votre activité récente", archivedPosts: 'Publications archivées', manage: 'Gérer',
    changePassword: 'Changer le mot de passe', twoFactor: 'Authentification à deux facteurs', twoFactorDesc: "Préférence locale uniquement ; l'activation nécessite une configuration du fournisseur d'authentification", activeDevices: 'Appareils actifs', thisDevice: 'Cet appareil', currentSession: 'Session actuelle', signOutAll: 'Déconnecter tous les appareils', signedOut: 'Les autres sessions ont été déconnectées', currentPassword: 'Mot de passe actuel', newPassword: 'Nouveau mot de passe', confirmPassword: 'Confirmer le mot de passe', passwordMismatch: 'Les mots de passe ne correspondent pas', passwordChanged: 'Mot de passe mis à jour', updatePassword: 'Mettre à jour le mot de passe', cancel: 'Annuler',
    postNotifications: 'Notifications de publications', likes: 'J’aime', comments: 'Commentaires', newFollows: 'Nouveaux abonnés', messages: 'Messages', sound: 'Sons', vibration: 'Vibrations',
    theme: "Thème de l'application", light: 'Clair', dark: 'Sombre', auto: 'Automatique', accent: "Couleur principale", fontSize: 'Taille du texte', density: "Densité de l'interface", comfortable: 'Confortable', compact: 'Compacte',
    arabic: 'العربية', french: 'Français', english: 'English', languageSaved: 'Langue enregistrée',
    blockedWords: 'Mots masqués', addWord: 'Ajouter un mot', blockedAccounts: 'Comptes bloqués', noBlockedAccounts: 'Aucun compte bloqué', remove: 'Supprimer', commentFilter: 'Filtre des commentaires', normal: 'Normal', strict: 'Strict',
    reduceMotion: 'Réduire les animations', highContrast: 'Contraste élevé', screenReader: 'Améliorations du lecteur d’écran', autoTranslate: 'Traduction automatique',
    downloadData: 'Télécharger mes données', deleteAccount: 'Supprimer le compte', deleteWarning: "La suppression est définitive. Cette interface ne peut pas supprimer directement un compte d'authentification.", typeDelete: 'Saisissez DELETE pour confirmer', deleteConfirm: 'Confirmer la demande', deleteUnavailable: "Le compte n'a pas été supprimé. Contactez le support pour finaliser la demande en toute sécurité.",
    version: 'Version', terms: 'Conditions générales', privacyPolicy: 'Politique de confidentialité', contact: 'Nous contacter', rateApp: "Évaluer l'application", unavailable: "Ce service n'est pas encore activé.",
    profileSaved: 'Modifications enregistrées', avatarError: "Impossible de changer la photo", retry: 'Réessayer', loading: 'Chargement des paramètres', wordExists: 'Ce mot existe déjà', add: 'Ajouter', currentDevice: 'Navigateur actuel', deleteModalTitle: 'Confirmer la suppression du compte', passwordModalTitle: 'Changer le mot de passe', emailUpdateNote: "La modification de l'adresse peut nécessiter une confirmation par e-mail.",
    closeDialog: 'Fermer la fenêtre', profileLoading: 'Chargement du profil...', profileNotFound: "Ce profil n'existe pas ou n'est plus disponible.", profileLoadError: 'Impossible de charger le profil. Vérifiez votre connexion puis réessayez.', profileSignInRequired: 'Connectez-vous pour afficher votre profil.', errorTitle: 'Une erreur technique inattendue est survenue.', errorDescription: "Impossible d'afficher cette page. Rechargez-la ou retournez à l'accueil.", reloadPage: 'Recharger', returnHome: "Retour à l'accueil",
    directMessages: 'Messages directs', privateConversation: 'Conversation privée', waitingSignal: 'Un message vous attend', signalProfile: 'Profil', liveCall: 'Appel en direct',
    searchPageTitle: 'Recherche', searchPlaceholder: "Recherchez un nom d'utilisateur ou un identifiant...", searchClear: 'Effacer la recherche', searchError: 'Impossible de récupérer les résultats. Réessayez.', searchNoResults: 'Aucun résultat correspondant',
    voicePermissionDenied: "L'accès au microphone a été refusé. Vérifiez l'autorisation du site puis réessayez.", microphoneUnavailable: 'Microphone indisponible. Vérifiez sa connexion ou la compatibilité du navigateur.', microphoneBusy: "Le microphone est utilisé par une autre application. Fermez-la puis réessayez.", microphoneSecureContext: 'Une connexion sécurisée est nécessaire pour utiliser le microphone.', voiceUploadError: "Impossible d'envoyer le message vocal. Vérifiez la connexion et l'autorisation du microphone puis réessayez.", voicePlaybackError: 'Impossible de lire le message vocal.', voiceLoading: 'Chargement de l’enregistrement...', ideaPlanner: "Planificateur d’idées", ideaPlannerThinking: 'Préparation de la proposition',
  },
  en: {
    title: 'Settings', back: 'Back', account: 'Account', privacy: 'Privacy', security: 'Security', notifications: 'Notifications', appearance: 'Appearance', language: 'Language', content: 'Content', accessibility: 'Accessibility', data: 'Data', about: 'About',
    accountDetails: 'Account details', changePhoto: 'Change photo', fullName: 'Full name', username: 'Username', email: 'Email address', phone: 'Phone number', bio: 'Bio', saveChanges: 'Save changes', saving: 'Saving...', saved: 'Saved', saveError: 'Save failed. Please try again.',
    localNotice: 'Privacy and notification preferences are stored on this device only and do not change database permissions.', privateAccount: 'Private account', privateAccountDesc: 'Choose who can see your posts', whoCanMessage: 'Who can send you messages', everyone: 'Everyone', followers: 'Followers', nobody: 'No one', showEmail: 'Show email address', showEmailDesc: 'Allow your email to appear on your profile', showLastSeen: 'Show last seen', showLastSeenDesc: 'Let others see when you were recently active', archivedPosts: 'Archived posts', manage: 'Manage',
    changePassword: 'Change password', twoFactor: 'Two-factor authentication', twoFactorDesc: 'Local preference only; activation requires authentication provider setup', activeDevices: 'Active devices', thisDevice: 'This device', currentSession: 'Current session', signOutAll: 'Sign out of all devices', signedOut: 'Other sessions have been signed out', currentPassword: 'Current password', newPassword: 'New password', confirmPassword: 'Confirm password', passwordMismatch: 'Passwords do not match', passwordChanged: 'Password updated', updatePassword: 'Update password', cancel: 'Cancel',
    postNotifications: 'Post notifications', likes: 'Likes', comments: 'Comments', newFollows: 'New followers', messages: 'Messages', sound: 'Sounds', vibration: 'Vibration',
    theme: 'App theme', light: 'Light', dark: 'Dark', auto: 'Automatic', accent: 'App accent color', fontSize: 'Text size', density: 'Interface density', comfortable: 'Comfortable', compact: 'Compact',
    arabic: 'العربية', french: 'Français', english: 'English', languageSaved: 'Language saved',
    blockedWords: 'Hidden words', addWord: 'Add a word', blockedAccounts: 'Blocked accounts', noBlockedAccounts: 'No blocked accounts', remove: 'Remove', commentFilter: 'Comment filter', normal: 'Normal', strict: 'Strict',
    reduceMotion: 'Reduce motion', highContrast: 'High contrast', screenReader: 'Screen reader support', autoTranslate: 'Automatic translation',
    downloadData: 'Download a copy of my data', deleteAccount: 'Delete account', deleteWarning: 'Account deletion is permanent. This interface cannot directly delete an authentication account.', typeDelete: 'Type DELETE to confirm', deleteConfirm: 'Confirm request', deleteUnavailable: 'The account was not deleted. Contact support to complete the request securely.',
    version: 'Version', terms: 'Terms and conditions', privacyPolicy: 'Privacy policy', contact: 'Contact us', rateApp: 'Rate the app', unavailable: 'This service is not enabled yet.',
    profileSaved: 'Changes saved', avatarError: 'Could not change the photo', retry: 'Retry', loading: 'Loading settings', wordExists: 'This word already exists', add: 'Add', currentDevice: 'Current browser', deleteModalTitle: 'Confirm account deletion', passwordModalTitle: 'Change password', emailUpdateNote: 'Changing your email may require email confirmation.',
    closeDialog: 'Close dialog', profileLoading: 'Loading profile...', profileNotFound: 'This profile does not exist or is no longer available.', profileLoadError: 'Could not load the profile. Check your connection and try again.', profileSignInRequired: 'Sign in to view your profile.', errorTitle: 'An unexpected technical error occurred.', errorDescription: 'This page could not be displayed. Reload it or return to the home page.', reloadPage: 'Reload page', returnHome: 'Return home',
    directMessages: 'Direct messages', privateConversation: 'Private conversation', waitingSignal: 'A message is waiting for you', signalProfile: 'Profile', liveCall: 'Live call',
    searchPageTitle: 'Search', searchPlaceholder: 'Search by username or ID...', searchClear: 'Clear search', searchError: 'Could not load results. Please try again.', searchNoResults: 'No matching results',
    voicePermissionDenied: 'Microphone access was denied. Check this site’s permission and try again.', microphoneUnavailable: 'Microphone unavailable. Check its connection or browser support.', microphoneBusy: 'The microphone is being used by another app. Close it and try again.', microphoneSecureContext: 'A secure connection is required to use the microphone.', voiceUploadError: 'Could not send the voice message. Check your connection and microphone permission, then try again.', voicePlaybackError: 'Could not play the voice message.', voiceLoading: 'Loading recording...', ideaPlanner: 'Idea planner', ideaPlannerThinking: 'Preparing the proposal',
  },
} as const;

export type LanguagePickerKey = 'searchPlaceholder' | 'comingSoon' | 'noResults' | 'noResultsSuggestion';

const languagePickerMessages: Record<Language, Record<LanguagePickerKey, string>> = {
  ar: {
    searchPlaceholder: 'ابحث عن لغتك',
    comingSoon: 'قريباً',
    noResults: 'لا توجد لغة بهذا الاسم',
    noResultsSuggestion: 'جرّب البحث بالاسم الأصلي أو الإنجليزي أو رمز اللغة.',
  },
  fr: {
    searchPlaceholder: 'Recherchez votre langue',
    comingSoon: 'Bientôt',
    noResults: 'Aucune langue trouvée',
    noResultsSuggestion: 'Essayez le nom natif, le nom anglais ou le code de langue.',
  },
  en: {
    searchPlaceholder: 'Search for your language',
    comingSoon: 'Coming soon',
    noResults: 'No language found',
    noResultsSuggestion: 'Try the native name, English name, or language code.',
  },
};

export type TranslationKey = keyof typeof messages.ar;

export function translate(language: Language, key: TranslationKey): string {
  return messages[language][key];
}

export function translateLanguagePicker(language: Language, key: LanguagePickerKey): string {
  return languagePickerMessages[language][key];
}

export function getStoredLanguage(): Language {
  try {
    const saved = localStorage.getItem('ds-language');
    if (isAvailableLanguageCode(saved)) return saved;
  } catch {
    return 'ar';
  }
  return 'ar';
}

export function directionForLanguage(language: Language): TextDirection {
  return language === 'ar' ? 'rtl' : 'ltr';
}

export function getStoredDirection(): TextDirection {
  try {
    const saved = localStorage.getItem('ds-direction');
    if (saved === 'rtl' || saved === 'ltr') return saved;
  } catch {
    return directionForLanguage(getStoredLanguage());
  }
  return directionForLanguage(getStoredLanguage());
}

export const LANGUAGE_CHANGE_EVENT = 'ds-language-change';

export function setStoredLanguage(language: Language): void {
  const direction = directionForLanguage(language);
  try {
    localStorage.setItem('ds-language', language);
    localStorage.setItem('ds-direction', direction);
  } catch {
    // The in-memory language change still works when storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: { language, direction } }));
}
