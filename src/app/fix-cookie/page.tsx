"use client";

import { useEffect, useState } from "react";
import { HelperLogout } from "./actions"; // We need a server action to clear cookie

export default function FixCookiePage() {
    const [status, setStatus] = useState("Iniciando limpeza...");

    useEffect(() => {
        HelperLogout().then(() => {
            setStatus("Cookies limpos! Você será redirecionado para o login.");
            setTimeout(() => {
                window.location.href = "/auth/login";
            }, 2000);
        });
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-white text-black">
            <div className="p-8 border rounded shadow-lg text-center">
                <h1 className="text-2xl font-bold mb-4">Reparação de Sessão</h1>
                <p>{status}</p>
            </div>
        </div>
    );
}
