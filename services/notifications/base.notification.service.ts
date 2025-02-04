import { NotificationPayload } from './types';

export abstract class BaseNotificationService {
    abstract send(payload: NotificationPayload): Promise<boolean>;
}
