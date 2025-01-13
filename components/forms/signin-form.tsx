"use client";

import Link from "next/link";


import {
    CardTitle,
    CardDescription,
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    
} from "@/components/ui/card";

import { Button } from "../ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function SigninForm() {
    return (
        <div className="w-full max-w-md">
            <form>
                <Card>
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-center text-3xl font-bold mb-4">Вход</CardTitle>
                        <CardDescription>
                            Введите ваш email и пароль, чтобы войти
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Email</Label>
                            <Input 
                                id="identifier"
                                name="identifier"
                                type="text"
                                placeholder="email"
                            />
                        </div>
                        

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input 
                                id="password"
                                name="password"
                                type="password"
                                placeholder="пароль"
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col">
                        <Button className="w-full">
                            Войти
                        </Button>
                    </CardFooter>
                </Card>
                <div className="mt-4 text-center text-sm">
                    Нет аккаунта?
                    <Link className="underline ml-2" href="signup">
                        Зарегистрироваться
                    </Link>
                </div>
            </form>
        </div>
    )
}