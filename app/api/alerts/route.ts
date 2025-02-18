// import { NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/libs/auth/providers';
// import { services } from '@/services';
// import { AlertManagerPayload } from '@/services/notifications/alermanager.types';
// import { generateAlertEmailHtml, generateAlertTelegramText } from '@/services/notifications/templates/alert.template';
// // import { logger } from '@/utils/logger';

// const { email, telegram } = services.infrastructure.notifications;
// const { notification_settings, telegram_settings, user } = services.data;



// export async function POST(request: Request) {
//     try {
//         const contentType = request.headers.get('Content-Type');
//         if (contentType !== 'application/json') {
//             return NextResponse.json(
//                 { error: 'Invalid content type' }, 
//                 { status: 400 });
//     }
//     const payload: AlertManagerPayload = await request.json();


// }