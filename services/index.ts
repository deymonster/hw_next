import { prisma } from "@/libs/prisma";
import { UserService } from "./user.service";

let services: { user: UserService };

if (typeof window === 'undefined') {
    services = {
        user: new UserService(prisma),
    };
} else {
    services = {
        user: null as any // или создайте заглушку для клиентской стороны
    };
}

export { services };
