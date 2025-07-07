export const changeEmailTemplate = (
	currentEmail: string,
	newEmail: string,
	code: string
) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 20px;
        }
        .header {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #2c3e50;
            margin: 0;
            font-size: 24px;
        }
        .content {
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e9ecef;
        }
        .verification-code {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            font-size: 24px;
            text-align: center;
            margin: 20px 0;
            font-weight: bold;
            color: #2c3e50;
        }
        .warning {
            color: #856404;
            background-color: #fff3cd;
            padding: 10px;
            border-radius: 4px;
            margin-top: 20px;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Запрос на смену email</h1>
        </div>
        <div class="content">
            <p>Вами было запрошено изменение адреса электронной почты с <strong>${currentEmail}</strong> на <strong>${newEmail}</strong>.</p>
            <p>Ваш код проверки:</p>
            <div class="verification-code">${code}</div>
            <p>Код действителен в течении 15 минут.</p>
            <div class="warning">
                <p>Если вы не запрашивали смены адреса почты, пожалуйста проигнорируйте данное сообщение.</p>
            </div>
        </div>
        <div class="footer">
            <p>NITRINOnet Monitoring System</p>
        </div>
    </div>
</body>
</html>
`
