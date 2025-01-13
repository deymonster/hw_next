import { prisma } from "@/libs/prisma";
import { UserService } from "./user.service";

export const services = {
    user: new UserService(prisma),
};
