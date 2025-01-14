'use server';


import nodemailer from "nodemailer";
import { z } from "zod";



// Схема для проверки SMTP-конфигурации
const smtpConfigSchema = z.object({
  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z.string().regex(/^\d+$/, "SMTP_PORT must be a number"),
  SMTP_USER: z.string().min(1, "SMTP_USER is required"),
  SMTP_PASSWORD: z.string().min(1, "SMTP_PASSWORD is required"),
  SMTP_FROM_EMAIL: z.string().email("SMTP_FROM_EMAIL must be a valid email"),
  SMTP_FROM_NAME: z.string().min(1, "SMTP_FROM_NAME is required"),
});

// Проверка переменных окружения
const smtpConfig = smtpConfigSchema.safeParse(process.env);
console.log("SMTP_HOST:", process.env.SMTP_HOST);

if (!smtpConfig.success) {
  console.error("❌ Invalid SMTP configuration:", smtpConfig.error.format());
  throw new Error("Invalid SMTP configuration. Fix your .env file.");
}

// Экспортируем конфигурацию
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL, SMTP_FROM_NAME } =
  smtpConfig.data;

// Создание транспорта для отправки почты
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: parseInt(SMTP_PORT, 10),
  secure: false, // Если порт 587 (для STARTTLS)
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
});

// Функция отправки почты
export async function sendMail({
  email, // Переопределяет SMTP_FROM_EMAIL, если указан
  sendTo,
  subject,
  text,
  html,
}: {
  email?: string; // Отправитель (опционально, используется SMTP_FROM_EMAIL по умолчанию)
  sendTo: string; // Получатель
  subject: string; // Тема письма
  text: string; // Текстовое содержание
  html?: string; // HTML-содержание (опционально)
}) {
  try {
    // Проверяем доступность SMTP-сервера
    await transporter.verify();
  } catch (error: any) {
    console.error("Error verifying SMTP server:", error.message);
    throw new Error(`Error verifying SMTP server: ${error.message}`);
  }

  // Формируем от кого письмо (используем значения из .env, если email не указан)
  const from = email
    ? `${email}` // Если передан email, используем его
    : `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`; // Используем данные из конфигурации

  try {
    const info = await transporter.sendMail({
      from,
      to: sendTo,
      subject,
      text,
      html: html || "", // Если html не передан, используем пустую строку
    });

    console.log("Message sent: %s", info.messageId);
    console.log("Mail sent to", sendTo);
    return info;
  } catch (error: any) {
    console.error("Error sending email:", error.message);
    throw new Error(`Error sending email: ${error.message}`);
  }
}
