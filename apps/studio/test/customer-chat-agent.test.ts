import { describe, expect, test } from "vitest";
import { runCustomerChatTurn } from "../src/customer-chat-agent.js";

describe("customer chat agent", () => {
  test("answers greetings without running a build action", async () => {
    const result = await runCustomerChatTurn({ message: "مرحبا" });

    expect(result.action).toBe("reply");
    expect(result.reply).toContain("chatbot");
  });

  test("asks a follow-up question for generic chatbot goals instead of treating them as source documents", async () => {
    const result = await runCustomerChatTurn({
      message: "بدي افضل تشات بوت يساعد المستخدمين يعرفوا عن الخدمات ويحفزهم على الشراء"
    });

    expect(result.action).toBe("reply");
    expect(result.reply).toContain("أرسل لي الآن رابط الموقع");
  });

  test("routes explicit URLs to the crawler action", async () => {
    const result = await runCustomerChatTurn({ message: "هذا الموقع https://example.com" });

    expect(result).toMatchObject({
      action: "crawl_url",
      url: "https://example.com"
    });
  });

  test("routes detailed business descriptions to the build action", async () => {
    const result = await runCustomerChatTurn({
      message:
        "اسم النشاط عيادة النور. نحتاج شات بوت يشرح خدمات فحص الأسنان وتبييض الأسنان وحجز المواعيد. نريد جمع اسم العميل ورقم الجوال والخدمة المطلوبة والموعد المناسب ثم تحويل الطلب للموظف."
    });

    expect(result.action).toBe("build_text");
    expect(result.reply).toContain("وصف كاف");
  });

  test("can use a live provider for conversational discovery replies", async () => {
    const result = await runCustomerChatTurn(
      { message: "كيف حالك" },
      {
        async generateReply() {
          return "تمام. قل لي اسم البزنس ونوع العملاء الذين تريد خدمتهم.";
        }
      }
    );

    expect(result).toEqual({
      action: "reply",
      reply: "تمام. قل لي اسم البزنس ونوع العملاء الذين تريد خدمتهم."
    });
  });

  test("uses owner context to build when the owner asks to build now", async () => {
    const result = await runCustomerChatTurn({
      message: "ابن الشجرة الآن",
      ownerContext:
        "- Decision 1: متجر إلكتروني ربحي.\n- Decision 2: البوت على الموقع وواتساب.\n- Decision 3: يجمع الاسم والجوال ويوجه العميل لرابط الشراء حسب المنتج."
    });

    expect(result.action).toBe("build_text");
    expect(result.reply).toContain("القرارات");
  });

  test("builds from accepted context when the owner says approved", async () => {
    const result = await runCustomerChatTurn({
      message: "اعتمد",
      history: [
        {
          role: "assistant",
          text: "المسار جاهز الآن كتصميم نهائي: فهم البزنس ثم توضيح الفرص ثم جمع البيانات."
        }
      ],
      ownerContext:
        "- Decision 1: بوت تأهيل عملاء الأتمتة.\n- Decision 2: يفهم البزنس من رابط أو ملف أو وصف.\n- Decision 3: يشرح فرص الأتمتة ثم يجمع الاسم والشركة والجوال والبريد الاختياري."
    });

    expect(result.action).toBe("build_text");
    expect(result.reply).toContain("workflow");
  });

  test("builds instead of asking again when the owner is clearly frustrated", async () => {
    const result = await runCustomerChatTurn({
      message: "يا اخي جهز تراك طفشتني",
      history: [
        {
          role: "assistant",
          text: "الخطوة التالية: أجهزه لك كتدفق محادثة كامل برسائل جاهزة وسيناريوهات الردود المختلفة."
        }
      ],
      ownerContext:
        "- Decision 1: النبرة احترافية ومبسطة.\n- Decision 2: الهدف جمع بيانات العميل فقط.\n- Decision 3: بدون سؤال الميزانية.\n- Decision 4: يختم بأن الفريق سيراجع الحالة ويتواصل معه."
    });

    expect(result.action).toBe("build_text");
    expect(result.reply).toContain("workflow");
  });

  test("proactively builds when the collected context is sufficient", async () => {
    const result = await runCustomerChatTurn({
      message: "يجمع البيانات فقط",
      history: [
        {
          role: "assistant",
          text: "هل عندك رابط تقويم للحجز، أم تريد البوت يجمع البيانات فقط؟"
        }
      ],
      ownerContext:
        "- Decision 1: هذا الموقع https://www.next-stepai.com/.\n- Decision 2: البوت يفهم البزنس من رابط موقع أو ملف أو وصف.\n- Decision 3: الهدف شرح فرص الأتمتة ومساعدة العميل على اتخاذ القرار.\n- Decision 4: الهدف النهائي حجز موعد استشارة أو طلب تواصل.\n- Decision 5: المطلوب أن يجمع البيانات فقط ثم يحولها للفريق."
    });

    expect(result.action).toBe("build_text");
    expect(result.reply).toContain("معلومات كافية");
  });

  test("does not treat a generic website chatbot request as an explicit build command", async () => {
    const result = await runCustomerChatTurn({
      message: "في عندي الموقع تبعي بدي اعمل تشات بوت عشان يساعد العملاء ويشرح لهم",
      ownerContext:
        "- Decision 1: صاحب البزنس يريد بوت للموقع.\n- Decision 2: الهدف مساعدة العملاء والرد على الاستفسارات.\n- Decision 3: المصدر المقصود هو الموقع لكن الرابط لم يرسل بعد."
    });

    expect(result.action).toBe("reply");
    expect(result.reply).toContain("رابط");
  });

  test("does not repeat generic first-step prompts when owner context already exists", async () => {
    const result = await runCustomerChatTurn({
      message: "خذ المنتجات من الموقع",
      ownerContext: "- Decision 1: الهدف استقبال طلبات وترشيح الخدمة المناسبة.\n- Decision 2: النبرة سعودية خفيفة."
    });

    expect(result.action).toBe("reply");
    expect(result.reply).toContain("سياق");
  });
});
