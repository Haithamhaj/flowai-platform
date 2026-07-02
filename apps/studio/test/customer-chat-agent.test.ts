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
