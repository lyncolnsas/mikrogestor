"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Shield, Plus, Trash2, Copy, Eye, EyeOff, RefreshCw,
    Server, Wifi, Lock, AlertTriangle, CheckCircle, XCircle,
    Key, User, Terminal, ChevronDown, ChevronUp
} from "lucide-react";

interface L2tpUser {
    username: string;
    service: string;
    ipOrWildcard: string;
}

interface L2tpConfig {
    psk: string | null;
    vpsIp: string;
    services: { strongswan: boolean; xl2tpd: boolean };
    config: { serverIp: string; authType: string; protocol: string; ports: { ike: number; natT: number; l2tp: number } };
}

export function L2tpUsersPanel() {
    const [users, setUsers] = useState<L2tpUser[]>([]);
    const [config, setConfig] = useState<L2tpConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPsk, setShowPsk] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showPskEdit, setShowPskEdit] = useState(false);
    const [showMikrotikGuide, setShowMikrotikGuide] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newPsk, setNewPsk] = useState("");
    const [deletingUser, setDeletingUser] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

    const showToast = (msg: string, type: "ok" | "err" = "ok") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [usersRes, configRes] = await Promise.all([
                fetch("/api/saas/l2tp/users"),
                fetch("/api/saas/l2tp/config"),
            ]);
            const usersData = await usersRes.json();
            const configData = await configRes.json();
            if (usersData.users) setUsers(usersData.users);
            if (!configData.error) setConfig(configData);
        } catch {
            showToast("Erro ao carregar dados L2TP", "err");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        showToast(`${label} copiado!`);
    };

    const handleAddUser = async () => {
        if (!newUsername.trim() || !newPassword.trim()) {
            showToast("Preencha usuário e senha", "err");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/saas/l2tp/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: newUsername.trim(), password: newPassword.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToast(data.message);
            setNewUsername("");
            setNewPassword("");
            setShowAddForm(false);
            loadData();
        } catch (e: any) {
            showToast(e.message || "Erro ao criar usuário", "err");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (username: string) => {
        if (!confirm(`Remover usuário "${username}"?`)) return;
        setDeletingUser(username);
        try {
            const res = await fetch(`/api/saas/l2tp/users/${encodeURIComponent(username)}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToast(data.message);
            loadData();
        } catch (e: any) {
            showToast(e.message || "Erro ao remover usuário", "err");
        } finally {
            setDeletingUser(null);
        }
    };

    const handleUpdatePsk = async () => {
        if (!newPsk.trim() || newPsk.trim().length < 8) {
            showToast("PSK deve ter pelo menos 8 caracteres", "err");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/saas/l2tp/config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ psk: newPsk.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToast(data.message);
            setNewPsk("");
            setShowPskEdit(false);
            loadData();
        } catch (e: any) {
            showToast(e.message || "Erro ao atualizar PSK", "err");
        } finally {
            setSaving(false);
        }
    };

    const serverIp = config?.vpsIp || "76.13.160.251";
    const currentPsk = config?.psk || "MikroGestorVPN2025@Secure";

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold animate-in slide-in-from-right-4 duration-300 ${toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
                    {toast.type === "ok" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                        <Shield className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">L2TP/IPSec</h2>
                        <p className="text-xs text-muted-foreground">Gerenciamento de usuários e configuração IPSec</p>
                    </div>
                </div>
                <button onClick={loadData} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Atualizar">
                    <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: "Servidor", value: serverIp, icon: Server, color: "blue" },
                    { label: "strongSwan", value: config?.services.strongswan ? "Ativo" : "Verificar", icon: Shield, color: config?.services.strongswan ? "emerald" : "amber" },
                    { label: "xl2tpd", value: config?.services.xl2tpd ? "Ativo" : "Verificar", icon: Wifi, color: config?.services.xl2tpd ? "emerald" : "amber" },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
                            <Icon className={`h-4 w-4 text-${color}-600`} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Portas */}
            <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">Portas Abertas</p>
                <div className="flex gap-3 flex-wrap">
                    {[
                        { port: "500/UDP", label: "IKE" },
                        { port: "4500/UDP", label: "NAT-T" },
                        { port: "1701/UDP", label: "L2TP" },
                    ].map(({ port, label }) => (
                        <div key={port} className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                            <span className="text-xs font-mono text-emerald-400">{port}</span>
                            <span className="text-xs text-slate-500">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* PSK Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-slate-500" />
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Pre-Shared Key (PSK)</h3>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowPsk(!showPsk)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            {showPsk ? <EyeOff className="h-3.5 w-3.5 text-slate-500" /> : <Eye className="h-3.5 w-3.5 text-slate-500" />}
                        </button>
                        <button onClick={() => handleCopy(currentPsk, "PSK")} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            <Copy className="h-3.5 w-3.5 text-slate-500" />
                        </button>
                        <button
                            onClick={() => setShowPskEdit(!showPskEdit)}
                            className="px-3 py-1.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                        >
                            Alterar PSK
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-lg p-3 font-mono text-sm">
                    <span className="text-emerald-400">
                        {showPsk ? currentPsk : "•".repeat(currentPsk.length)}
                    </span>
                </div>

                {showPskEdit && (
                    <div className="flex gap-2 pt-1">
                        <input
                            type="text"
                            value={newPsk}
                            onChange={(e) => setNewPsk(e.target.value)}
                            placeholder="Novo PSK (mín. 8 caracteres)"
                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                            onClick={handleUpdatePsk}
                            disabled={saving}
                            className="px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                        >
                            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Salvar"}
                        </button>
                    </div>
                )}
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-500" />
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                            Usuários L2TP
                            <span className="ml-2 text-xs font-normal text-muted-foreground">({users.length})</span>
                        </h3>
                    </div>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Novo Usuário
                    </button>
                </div>

                {/* Add Form */}
                {showAddForm && (
                    <div className="px-5 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                        <div className="flex gap-3 flex-wrap">
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="Nome de usuário"
                                className="flex-1 min-w-[160px] px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onKeyDown={(e) => e.key === "Enter" && handleAddUser()}
                            />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Senha"
                                className="flex-1 min-w-[160px] px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onKeyDown={(e) => e.key === "Enter" && handleAddUser()}
                            />
                            <button
                                onClick={handleAddUser}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                            >
                                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Criar</>}
                            </button>
                            <button
                                onClick={() => { setShowAddForm(false); setNewUsername(""); setNewPassword(""); }}
                                className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Users List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <User className="h-10 w-10 text-slate-300 mb-3" />
                        <p className="text-sm font-medium text-slate-500">Nenhum usuário L2TP cadastrado</p>
                        <p className="text-xs text-slate-400 mt-1">Clique em "Novo Usuário" para adicionar</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {users.map((user) => (
                            <div key={user.username} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                        {user.username[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.username}</p>
                                        <p className="text-xs text-muted-foreground">Serviço: {user.service} • IP: {user.ipOrWildcard}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDeleteUser(user.username)}
                                        disabled={deletingUser === user.username}
                                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="Remover usuário"
                                    >
                                        {deletingUser === user.username
                                            ? <RefreshCw className="h-4 w-4 animate-spin" />
                                            : <Trash2 className="h-4 w-4" />
                                        }
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MikroTik Guide */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button
                    onClick={() => setShowMikrotikGuide(!showMikrotikGuide)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            Como configurar no MikroTik
                        </span>
                    </div>
                    {showMikrotikGuide ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>

                {showMikrotikGuide && (
                    <div className="px-5 pb-5 space-y-3">
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>Certifique-se de ter criado o usuário acima antes de configurar o MikroTik.</span>
                        </div>

                        <div className="space-y-2">
                            {[
                                { step: "1", title: "Abra o Winbox e vá em:", cmd: "PPP → Interface → Add → L2TP Client" },
                                {
                                    step: "2", title: "Configure:", cmd:
                                        `Connect To: ${serverIp}\nUser: [usuário criado acima]\nPassword: [senha criada acima]`
                                },
                                { step: "3", title: "Vá em Profile e configure IPSec:", cmd: `Use IPSec: yes\nIPSec Secret: ${currentPsk}` },
                                { step: "4", title: "Comando RouterOS alternativo:", cmd: `/interface l2tp-client add name=l2tp-mikrogestor connect-to=${serverIp} user=[USUARIO] password=[SENHA] use-ipsec=yes ipsec-secret="${currentPsk}" disabled=no add-default-route=no` },
                            ].map(({ step, title, cmd }) => (
                                <div key={step} className="bg-slate-900 rounded-lg p-3 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-300 font-medium">
                                            <span className="text-blue-400 font-bold">Passo {step}:</span> {title}
                                        </p>
                                        <button onClick={() => handleCopy(cmd, `Passo ${step}`)} className="p-1 rounded hover:bg-slate-700 transition-colors">
                                            <Copy className="h-3 w-3 text-slate-400" />
                                        </button>
                                    </div>
                                    <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap leading-relaxed">{cmd}</pre>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
