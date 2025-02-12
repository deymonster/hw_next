export const verifyEmailTemplate = (code: string) => `
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
            <h1>Проверка email</h1>
        </div>
        <div class="content">
            <p>Для подтверждения адреса электронной почты используйте следующий код:</p>
            <div class="verification-code">${code}</div>
            <p>Код действителен в течении 15 минут.</p>
        </div>
        <div class="footer">
            <p>NITRINOnet Monitoring System</p>
        </div>
    </div>
</body>
</html>
`;