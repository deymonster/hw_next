import { NextResponse } from "next/server";
import { services } from '@/services/index';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
        return NextResponse.json(
            { success: false, message: "Токен отсутствует" },
            { status: 400 }
          );
    }

    try {
        const user = await services.user.getByToken(token);
        if (!user) {
            return NextResponse.json(
              { success: false, message: "Токен недействителен или устарел" },
              { status: 400 }
            );
        }
        await services.user.update(user.id, {
            emailVerified: true,
            verificationToken: null, 
          });
        
        return NextResponse.json(
            { success: true, message: "Email успешно подтвержден" },
            { status: 200 }
        );
        
    } catch (error) {
            console.error("Error verifying email:", error);
        return NextResponse.json(
        { success: false, message: "Ошибка подтверждения email" },
        { status: 500 }
        );
    }
}