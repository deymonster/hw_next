import { prisma } from "@/libs/prisma";
import { UserService } from './user.service'
import { NotificationService } from './notification.service'



export const services = {
    user: new UserService(prisma),
    notification: new NotificationService(prisma)
}
