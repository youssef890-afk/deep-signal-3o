import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowUp, Check, ChevronDown, Download, Loader2, Paperclip, Plus, Sparkles, X } from 'lucide-react';
import AuthRobot from '@/components/AuthRobot';
import { directionForLanguage, getStoredLanguage, LANGUAGE_CHANGE_EVENT, translate, type Language, type TranslationKey } from '@/lib/i18n';
import { sendJokalMessage, type JokalImagePayload } from '@/lib/jokal/client';
import { JOKAL_LIMITS, type JokalProposal, type JokalStage } from '@/lib/jokal/types';
import { compressImage } from '@/utils/compressImage';

type ChatMessage = { role: 'user' | 'assistant'; content: string; image?: JokalImagePayload };
type AiMessageKey = Parameters<typeof translate>[1];
type AssistantMode = 'signal' | 'image';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;
const MAX_COMPRESSED_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const API_ERROR_TRANSLATIONS: Record<string, AiMessageKey> = {
  AUTH_REQUIRED: 'assistantAuthRequired',
  DAILY_CHAT_LIMIT: 'assistantChatLimit',
  DAILY_IMAGE_LIMIT: 'assistantImageLimit',
  IMAGE_TYPE_UNSUPPORTED: 'imageTypeUnsupported',
  INVALID_IMAGE: 'imageCompressError',
  IMAGE_GENERATION_FAILED: 'imageGenerationFailed',
  CONTENT_BLOCKED: 'assistantContentBlocked',
  QUOTA_UNAVAILABLE: 'assistantQuotaUnavailable',
};

function readImageAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Image conversion returned an unsupported result.'));
        return;
      }
      const separator = reader.result.indexOf(',');
      if (separator < 0) {
        reject(new Error('Image conversion returned malformed data.'));
        return;
      }
      resolve(reader.result.slice(separator + 1));
    };
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.readAsDataURL(file);
  });
}

function localizedAssistantError(code: string | undefined, t: (key: AiMessageKey) => string) {
  const translation = code ? API_ERROR_TRANSLATIONS[code] : undefined;
  return translation ? t(translation) : t('friendlyAssistantError');
}

function imageExtension(mimeType: string) {
  return mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
}

const STAGES: { stage: JokalStage; translation: TranslationKey }[] = [
  { stage: 'conversation', translation: 'ideaStage' },
  { stage: 'clarifying_questions', translation: 'clarificationStage' },
  { stage: 'proposal', translation: 'specificationStage' },
];

const PLATFORM_PROMPTS: TranslationKey[] = ['platformPrompt1', 'platformPrompt2', 'platformPrompt3', 'platformPrompt4', 'platformPrompt5'];

function ProposalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-[var(--border)] py-4 first:border-0 first:pt-0">
      <h3 className="mb-2 text-xs font-semibold text-white/60">{title}</h3>
      {children}
    </section>
  );
}

function BulletList({ items, t }: { items: string[]; t: (key: AiMessageKey) => string }) {
  if (items.length === 0) return <p className="text-sm text-white/45">{t('unspecified')}</p>;
  return (
    <ul className="space-y-1.5 text-sm leading-6 text-white/75">
      {items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2"><span className="text-[var(--accent)]">•</span><span>{item}</span></li>)}
    </ul>
  );
}

function ProposalView({ proposal, t }: { proposal: JokalProposal; t: (key: AiMessageKey) => string }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[var(--accent)]">{proposal.projectType}</p>
        <h3 className="mt-1 text-xl font-bold text-white">{proposal.projectName}</h3>
        <p className="mt-2 text-sm leading-6 text-white/65">{proposal.shortDescription}</p>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-md border border-[var(--border)] px-2 py-1 text-white/65">{t('complexity')}: {proposal.estimatedComplexity}</span>
        <span className="rounded-md border border-[var(--border)] px-2 py-1 text-white/65">{t('developmentEffort')}: {proposal.estimatedDevelopmentEffort}</span>
      </div>
      <ProposalSection title={t('problemAndSolution')}>
        <p className="text-sm leading-6 text-white/75">{proposal.mainProblem}</p>
        <p className="mt-2 text-sm leading-6 text-white/75">{proposal.solution}</p>
      </ProposalSection>
      <ProposalSection title={t('targetAudience')}>
        <p className="text-sm leading-6 text-white/75">{proposal.targetAudience}</p>
      </ProposalSection>
      <ProposalSection title={t('coreFeatures')}><BulletList items={proposal.coreFeatures} t={t} /></ProposalSection>
      <ProposalSection title={t('optionalFeatures')}><BulletList items={proposal.optionalFeatures} t={t} /></ProposalSection>
      <ProposalSection title={t('screens')}>
        <div className="space-y-3">
          {proposal.screens.map((screen, index) => (
            <div key={`${screen.name}-${index}`}>
              <p className="text-sm font-medium text-white/80">{screen.name}</p>
              <p className="text-xs leading-5 text-white/50">{screen.purpose}</p>
              <BulletList items={screen.keyElements} t={t} />
            </div>
          ))}
        </div>
      </ProposalSection>
      <ProposalSection title={t('implementationPhases')}>
        <div className="space-y-3">
          {proposal.implementationPhases.map((phase, index) => (
            <div key={`${phase.name}-${index}`}>
              <p className="text-sm font-medium text-white/80">{index + 1}. {phase.name}</p>
              <BulletList items={phase.deliverables} t={t} />
            </div>
          ))}
        </div>
      </ProposalSection>
      <ProposalSection title={t('risksAndMitigation')}>
        {proposal.risks.length === 0 ? <p className="text-sm text-white/45">{t('noRisksFound')}</p> : (
          <ul className="space-y-3">
            {proposal.risks.map((risk, index) => <li key={`${risk.title}-${index}`}><p className="text-sm text-white/80">{risk.title}</p><p className="text-xs leading-5 text-white/50">{risk.mitigation}</p></li>)}
          </ul>
        )}
      </ProposalSection>
      <ProposalSection title={t('securityRequirements')}><BulletList items={proposal.securityRequirements} t={t} /></ProposalSection>
      <p className="border-t border-white/10 pt-3 text-[11px] leading-5 text-white/45">{t('proposalDisclaimer')}</p>
    </div>
  );
}

export default function JokalPage() {
  const [language, setLanguage] = useState<Language>(getStoredLanguage);
  const reduceMotion = useReducedMotion();
  const t = (key: AiMessageKey) => translate(language, key);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<JokalProposal | null>(null);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [stage, setStage] = useState<JokalStage>('conversation');
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<AssistantMode>('signal');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [coolingDown, setCoolingDown] = useState(false);
  const [error, setError] = useState('');
  const [proposalOpen, setProposalOpen] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const hasConversation = messages.length > 0;

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      setLanguage((event as CustomEvent<{ language: Language }>).detail.language);
    };
    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
  }, []);

  useEffect(() => {
    if (!coolingDown) return;
    const timeout = window.setTimeout(() => setCoolingDown(false), JOKAL_LIMITS.requestCooldownMs);
    return () => window.clearTimeout(timeout);
  }, [coolingDown]);

  useEffect(() => {
    if (!imagePreviewUrl) return;
    return () => URL.revokeObjectURL(imagePreviewUrl);
  }, [imagePreviewUrl]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [messages, sending, reduceMotion]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 192)}px`;
  }, [draft]);

  useEffect(() => {
    if (proposal) setProposalOpen(true);
  }, [proposal]);

  useEffect(() => {
    if (!proposalOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProposalOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [proposalOpen]);

  function startNewProject() {
    setMessages([]);
    setConversationId(null);
    setProposal(null);
    setClarifyingQuestions([]);
    setStage('conversation');
    setDraft('');
    setMode('signal');
    setImageFile(null);
    setImagePreviewUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    setError('');
    setProposalOpen(false);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending || coolingDown) return;

    setSending(true);
    setCoolingDown(true);
    setError('');

    try {
      let image: JokalImagePayload | undefined;
      if (mode === 'signal' && imageFile) {
        const compressedImage = await compressImage(imageFile);
        if (!IMAGE_MIME_TYPES.includes(compressedImage.type)
          || compressedImage.size > MAX_COMPRESSED_IMAGE_SIZE_BYTES) {
          throw new Error('Image compression did not produce an accepted payload size or type.');
        }
        image = {
          mimeType: compressedImage.type,
          data: await readImageAsBase64(compressedImage),
        };
      }

      const result = await sendJokalMessage({
        message,
        conversationId,
        history: messages.slice(-9),
        image,
        mode,
      });

      if (result.error) {
        console.error('Jokal assistant request failed:', { code: result.errorCode });
        setError(localizedAssistantError(result.errorCode, t));
        return;
      }

      if (result.conversationId) setConversationId(result.conversationId);
      setStage(result.stage);
      setClarifyingQuestions(result.clarifyingQuestions);
      if (result.proposal) setProposal(result.proposal);

      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        ...(image ? { image } : {}),
      };
      const assistantContent = result.reply || (result.image ? t('imageGenerated') : '');
      const assistantMessage: ChatMessage | null = assistantContent || result.image
        ? {
          role: 'assistant',
          content: assistantContent,
          ...(result.image ? { image: result.image } : {}),
        }
        : null;
      setMessages((current) => [
        ...current,
        userMessage,
        ...(assistantMessage ? [assistantMessage] : []),
      ]);
      setDraft('');
      setImageFile(null);
      setImagePreviewUrl(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
    } catch (requestError) {
      console.error('Jokal assistant request failed before a response was handled:', requestError instanceof Error ? requestError.message : 'Unknown request error');
      setError(imageFile ? t('imageCompressError') : t('friendlyAssistantError'));
    } finally {
      setSending(false);
    }
  }

  function handleImageSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!IMAGE_MIME_TYPES.includes(file.type)) {
      removeSelectedImage();
      setError(t('imageTypeUnsupported'));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      removeSelectedImage();
      setError(t('imageTooLarge'));
      return;
    }

    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setError('');
  }

  function removeSelectedImage() {
    setImageFile(null);
    setImagePreviewUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  }

  const activeStage = proposal
    ? 2
    : stage === 'clarifying_questions' || stage === 'analysis' ? 1 : 0;

  return (
    <motion.main
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-3xl px-4 pb-32 pt-4 sm:px-6 sm:pt-6"
      dir={directionForLanguage(language)}
    >
      <header className="mb-6 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="w-[76px] shrink-0 overflow-hidden [&>div>section]:!px-0 [&>div>section>div:first-child]:!hidden [&>div>div>span]:!hidden [&>div>div>button]:!hidden">
            <AuthRobot language={language} message={t('welcomeMessage')} compact />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-white sm:text-xl">{t('aiPageTitle')}</h1>
              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--text)]/70">{t('freeBadge')}</span>
            </div>
          </div>
        </div>
        <button type="button" onClick={startNewProject} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-[var(--border)] px-2.5 text-xs text-white/70 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] sm:gap-2 sm:px-3 sm:text-sm">
          <Plus className="h-4 w-4" /> {t('newProject')}
        </button>
      </header>

      {!hasConversation ? (
        <section className="flex min-h-[min(62vh,620px)] flex-col items-center justify-center py-4 text-center">
          <div className="mb-5 w-full max-w-sm">
            <AuthRobot language={language} message={t('welcomeMessage')} />
          </div>
          <h2 className="mb-5 text-sm font-semibold text-white/85 sm:text-base">{t('conversationHeading')}</h2>
          <div className="grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-6">
            {PLATFORM_PROMPTS.map((prompt, index) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setDraft(t(prompt));
                  textareaRef.current?.focus();
                }}
                className={`col-span-1 min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs leading-5 text-white/70 transition hover:border-[var(--accent-ring)] hover:bg-[var(--accent-soft)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] sm:col-span-2 sm:text-sm ${index === 3 ? 'sm:col-start-2' : index === 4 ? 'col-span-2 w-1/2 justify-self-center sm:col-span-2 sm:w-auto' : ''}`}
              >
                {t(prompt)}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <>
          <div aria-label={t('planningStages')} className="mb-6 flex items-center justify-center gap-2 sm:gap-4">
            {STAGES.map(({ stage: item, translation }, index) => {
              const isComplete = index < activeStage;
              const isActive = index === activeStage;
              return (
                <div key={item} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none sm:gap-3">
                  <div className="flex shrink-0 flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] ${isComplete || isActive ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'border border-[var(--border)] text-white/35'}`}>
                      {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className={`max-w-24 text-center text-[9px] leading-4 sm:max-w-none sm:text-xs ${isComplete || isActive ? 'text-white/80' : 'text-white/35'}`}>{t(translation)}</span>
                  </div>
                  {index < STAGES.length - 1 && <span className={`h-px min-w-2 flex-1 ${isComplete ? 'bg-[var(--accent)]/60' : 'bg-[var(--border)]'}`} />}
                </div>
              );
            })}
          </div>

          <section ref={transcriptRef} aria-label={t('conversationHeading')} aria-live="polite" className="mb-5 max-h-[min(48vh,520px)] space-y-4 overflow-y-auto scroll-smooth px-1 py-2">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[82%] ${message.role === 'user' ? 'rounded-es-md bg-[var(--accent-soft)] text-white' : 'rounded-ee-md border border-[var(--border)] bg-[var(--surface)] text-white/85'}`}>
                  <p className="mb-1 text-[10px] font-medium text-white/45">{message.role === 'user' ? t('you') : t('ideaPlanner')}</p>
                  {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                  {message.image && (
                    <div className="mt-2 space-y-2">
                      <img
                        src={`data:${message.image.mimeType};base64,${message.image.data}`}
                        alt={message.content || t('imageGenerated')}
                        className="max-h-80 max-w-full rounded-xl object-contain"
                      />
                      {message.role === 'assistant' && (
                        <a
                          href={`data:${message.image.mimeType};base64,${message.image.data}`}
                          download={`deep-signal-image-${index + 1}.${imageExtension(message.image.mimeType)}`}
                          className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                        >
                          <Download className="h-4 w-4" />
                          {t('downloadGeneratedImage')}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-end">
                <div role="status" aria-label={t('ideaPlannerThinking')} className="flex items-center gap-2 rounded-2xl rounded-ee-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                  <span className="text-[10px] font-medium text-white/45">{mode === 'image' ? t('imageGenerating') : t('ideaPlanner')}</span>
                  <span aria-hidden="true" className="inline-flex gap-1">
                    {[0, 1, 2].map((dot) => <span key={dot} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)]" style={{ animationDelay: `${dot * 0.16}s` }} />)}
                  </span>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {clarifyingQuestions.length > 0 && !proposal && (
        <section className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" aria-label={t('clarifyingQuestions')}>
          <h2 className="mb-2 text-xs font-semibold text-white/80">{t('clarifyingQuestions')}</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm leading-6 text-white/65">
            {clarifyingQuestions.map((question, index) => <li key={`${question}-${index}`}>{question}</li>)}
          </ol>
        </section>
      )}

      {error && (
        <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--error)]/20 bg-[var(--error)]/[0.06] px-4 py-3">
          <p className="text-sm leading-6 text-white/80">{error}</p>
          <button type="button" onClick={() => formRef.current?.requestSubmit()} disabled={sending || coolingDown} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] disabled:cursor-wait disabled:opacity-45">
            {coolingDown && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('retry')}
          </button>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-md)] focus-within:border-[var(--accent-ring)] sm:p-3">
        <div role="group" aria-label={t('assistantModes')} className="mb-2 flex flex-wrap gap-2 px-2 pt-1">
          <button
            type="button"
            aria-pressed={mode === 'signal'}
            disabled={sending}
            onClick={() => setMode('signal')}
            className={`min-h-9 rounded-lg px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] ${mode === 'signal' ? 'bg-[var(--accent-soft)] text-white' : 'text-white/55 hover:bg-white/[0.05]'}`}
          >
            {t('imageAskMode')}
          </button>
          <button
            type="button"
            aria-pressed={mode === 'image'}
            disabled={sending}
            onClick={() => {
              setMode('image');
              removeSelectedImage();
            }}
            className={`min-h-9 rounded-lg px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] ${mode === 'image' ? 'bg-[var(--accent-soft)] text-white' : 'text-white/55 hover:bg-white/[0.05]'}`}
          >
            {t('imageGenerateMode')}
          </button>
          {mode === 'signal' && (
            <>
              <input
                ref={imageInputRef}
                id="jokal-image"
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={handleImageSelection}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={sending}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium text-white/60 transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] disabled:opacity-40"
              >
                <Paperclip className="h-4 w-4" />
                {t('attachImage')}
              </button>
            </>
          )}
        </div>
        {imagePreviewUrl && imageFile && mode === 'signal' && (
          <div className="mb-2 flex items-center gap-3 rounded-xl border border-[var(--border)] p-2">
            <img src={imagePreviewUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
            <p className="min-w-0 flex-1 truncate text-xs text-white/60">{imageFile.name}</p>
            <button
              type="button"
              onClick={removeSelectedImage}
              aria-label={t('removeImage')}
              disabled={sending}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/60 transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <label htmlFor="jokal-draft" className="sr-only">{t('composerLabel')}</label>
        <textarea
          ref={textareaRef}
          id="jokal-draft"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          maxLength={JOKAL_LIMITS.maxIdeaChars}
          rows={1}
          placeholder={t(mode === 'image' ? 'imagePromptPlaceholder' : hasConversation ? 'followupPlaceholder' : 'initialPlaceholder')}
          className="block max-h-48 min-h-12 w-full resize-none bg-transparent px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/35"
        />
        <div className="flex items-center justify-between gap-3 px-1 pt-1">
          <span className="text-[10px] text-white/35">{draft.length}/{JOKAL_LIMITS.maxIdeaChars}</span>
          <button type="submit" disabled={!draft.trim() || sending || coolingDown} aria-label={t('sendMessage')} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-40">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </form>

      {proposal && (
        <>
          <button type="button" onClick={() => setProposalOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" /> {t('viewSpecifications')} <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <AnimatePresence>
            {proposalOpen && (
              <motion.div
                className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-[2px]"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setProposalOpen(false);
                }}
              >
                <motion.aside
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="jokal-proposal-title"
                  initial={reduceMotion ? false : { opacity: 0, x: directionForLanguage(language) === 'rtl' ? 28 : -28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: directionForLanguage(language) === 'rtl' ? 28 : -28 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2 }}
                  className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:inset-y-0 sm:inset-x-auto sm:start-0 sm:max-h-none sm:w-[min(440px,92vw)] sm:rounded-none sm:border-y-0 sm:border-s sm:border-e"
                >
                  <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><Sparkles className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <h2 id="jokal-proposal-title" className="truncate text-sm font-bold text-white">{t('specificationsTitle')}</h2>
                        <p className="text-[10px] text-white/45">{t('readyForReview')}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setProposalOpen(false)} aria-label={t('closeSpecifications')} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/60 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]">
                      <X className="h-4 w-4" />
                    </button>
                  </header>
                  <div className="max-h-[calc(85dvh-65px)] overflow-y-auto px-4 py-4 sm:h-[calc(100dvh-65px)] sm:max-h-none sm:px-5">
                    <ProposalView proposal={proposal} t={t} />
                  </div>
                </motion.aside>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.main>
  );
}
