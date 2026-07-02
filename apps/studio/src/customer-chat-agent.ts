export interface CustomerChatMessage {
  role: "owner" | "assistant";
  text: string;
}

export interface CustomerChatTurnInput {
  message: string;
  history?: CustomerChatMessage[];
}

export type CustomerChatTurnResult =
  | {
      action: "reply";
      reply: string;
    }
  | {
      action: "crawl_url";
      reply: string;
      url: string;
    }
  | {
      action: "build_text";
      reply: string;
      content: string;
    };

export interface CustomerChatAgentProvider {
  generateReply(input: {
    message: string;
    history: CustomerChatMessage[];
    intent: "small_talk" | "builder_discovery" | "ready_to_build";
  }): Promise<string>;
}

export async function runCustomerChatTurn(
  input: CustomerChatTurnInput,
  provider?: CustomerChatAgentProvider
): Promise<CustomerChatTurnResult> {
  const message = input.message.trim();
  const history = input.history ?? [];
  if (!message) {
    return { action: "reply", reply: "اكتب لي رسالة قصيرة عن البزنس أو أرسل رابط الموقع/ملف الخدمات." };
  }

  const url = firstUrl(message);
  if (url) {
    return {
      action: "crawl_url",
      url,
      reply: "تمام، سأقرأ الرابط وأرجع لك بملخص واضح وأسئلة المتابعة قبل بناء الشجرة."
    };
  }

  if (isSmallTalkOnly(message)) {
    return {
      action: "reply",
      reply: await providerReplyOrFallback(provider, {
        message,
        history,
        intent: "small_talk",
        fallback: smallTalkReply(message)
      })
    };
  }

  if (!hasBusinessBuildSignal(message)) {
    return {
      action: "reply",
      reply: await providerReplyOrFallback(provider, {
        message,
        history,
        intent: "builder_discovery",
        fallback:
          "فهمت عليك. قبل ما أبني الشجرة أحتاج أعرف البزنس نفسه: ما اسم النشاط؟ وما أهم خدمة أو منتج تريد البوت يشرحها ويقرب العميل من شرائها؟"
      })
    };
  }

  if (!hasEnoughSourceDetail(message)) {
    return {
      action: "reply",
      reply: await providerReplyOrFallback(provider, {
        message,
        history,
        intent: "builder_discovery",
        fallback:
          "الفكرة واضحة: تريد بوت يساعد العميل يفهم الخدمات ويتحفز للشراء. أرسل لي الآن رابط الموقع أو اكتب أهم 3 خدمات/منتجات مع طريقة إتمام الطلب، وبعدها أبني لك workflow أولي."
      })
    };
  }

  return {
    action: "build_text",
    content: message,
    reply: "تمام، عندي وصف كافٍ كبداية. سأحوّله الآن إلى فهم بزنس، أسئلة ناقصة، ومسودة workflow قابلة للمراجعة."
  };
}

function firstUrl(text: string): string {
  const match = /https?:\/\/[^\s]+/.exec(text);
  return match ? match[0] : "";
}

function isSmallTalkOnly(text: string): boolean {
  const normalized = normalizeArabicText(text);
  return /^(مرحبا|هلا|السلام عليكم|السلام|اهلا|أهلا|هاي|hi|hello|كيف حالك|كيفك|شلونك|عامل ايه|صباح الخير|مساء الخير)$/.test(
    normalized
  );
}

function smallTalkReply(text: string): string {
  if (/كيف حالك|كيفك|شلونك|عامل ايه/i.test(text)) {
    return "أهلًا، تمام الحمد لله. خلينا نبني البوت صح: ما اسم البزنس أو أرسل لي رابط الموقع/ملف الخدمات، وبعدها أسألك سؤال سؤال لحد ما نطلع workflow واضح.";
  }
  return "أهلًا. أنا هنا عشان أبني معك chatbot للبزنس. ابدأ باسم النشاط أو أرسل رابط الموقع/ملف الخدمات، وسأسألك خطوة بخطوة.";
}

function hasBusinessBuildSignal(text: string): boolean {
  const normalized = normalizeArabicText(text);
  return /(بوت|تشات|chatbot|شات بوت|عميل|عملاء|شراء|خدمات|منتجات|بزنس|موقع|متجر|عيادة|شركة|مطعم|حجوزات|طلبات|workflow)/i.test(
    normalized
  );
}

function hasEnoughSourceDetail(text: string): boolean {
  const normalized = normalizeArabicText(text);
  const hasNamedBusiness = /(اسمه|اسم|متجر|عيادة|شركة|مطعم|مركز|منصة|مؤسسة)\s+[\u0600-\u06ffA-Za-z0-9]/.test(normalized);
  const serviceSignals = normalized.match(/(خدمة|منتج|باقة|سعر|حجز|طلب|شراء|دفع|توصيل|استشارة|موعد)/g) ?? [];
  return text.length >= 140 && (hasNamedBusiness || serviceSignals.length >= 2);
}

function normalizeArabicText(text: string): string {
  return text.trim().toLowerCase().replace(/[؟?!.,،]/g, "").replace(/\s+/g, " ");
}

async function providerReplyOrFallback(
  provider: CustomerChatAgentProvider | undefined,
  input: {
    message: string;
    history: CustomerChatMessage[];
    intent: "small_talk" | "builder_discovery" | "ready_to_build";
    fallback: string;
  }
): Promise<string> {
  if (!provider) return input.fallback;
  try {
    const reply = await provider.generateReply({
      message: input.message,
      history: input.history,
      intent: input.intent
    });
    return reply.trim() || input.fallback;
  } catch {
    return input.fallback;
  }
}
