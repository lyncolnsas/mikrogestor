"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, Save, MapPin } from "lucide-react"
import { updateSubscriberProfileAction } from "@/modules/customers/actions/subscriber-profile.actions"
import { useRouter } from "next/navigation"

const subscriberProfileSchema = z.object({
    name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    phone: z.string().min(10, "Telefone inválido (mínimo 10 dígitos)"),
    email: z.string().email("E-mail inválido"),
    street: z.string().min(1, "A rua é obrigatória"),
    number: z.string().min(1, "O número é obrigatório"),
    neighborhood: z.string().min(1, "O bairro é obrigatório"),
    city: z.string().min(1, "A cidade é obrigatória"),
    state: z.string().min(2, "O estado (UF) é obrigatório").max(2, "Use apenas a sigla (ex: SP)"),
    zipCode: z.string().min(8, "CEP inválido (mínimo 8 dígitos)"),
});

type ProfileFormValues = z.infer<typeof subscriberProfileSchema>;

interface SubscriberInfoFormProps {
    initialData: {
        id: string;
        name: string;
        phone?: string | null;
        email?: string | null;
        street?: string | null;
        number?: string | null;
        neighborhood?: string | null;
        city?: string | null;
        state?: string | null;
        zipCode?: string | null;
    }
}

export function SubscriberInfoForm({ initialData }: SubscriberInfoFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormValues>({
        resolver: zodResolver(subscriberProfileSchema),
        defaultValues: {
            name: initialData.name,
            phone: initialData.phone || "",
            email: initialData.email || "",
            street: initialData.street || "",
            number: initialData.number || "",
            neighborhood: initialData.neighborhood || "",
            city: initialData.city || "",
            state: initialData.state || "",
            zipCode: initialData.zipCode || "",
        }
    });

    const onSubmit = async (data: ProfileFormValues) => {
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const result = await updateSubscriberProfileAction(data);
            if (result.error) {
                setError(result.error);
            } else {
                setSuccess(true);
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message || "Erro ao atualizar perfil.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Dados Básicos */}
                <div className="space-y-6">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-600">
                        <AlertCircle className="h-5 w-5" /> Informações Pessoais
                    </h2>

                    <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input id="name" {...register("name")} placeholder="João da Silva" className="rounded-xl" />
                        {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone / WhatsApp</Label>
                            <Input id="phone" {...register("phone")} placeholder="(11) 99999-9999" className="rounded-xl" />
                            {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input id="email" {...register("email")} placeholder="joao@email.com" className="rounded-xl" />
                            {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
                        </div>
                    </div>
                </div>

                {/* Endereço */}
                <div className="space-y-6">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-600">
                        <MapPin className="h-5 w-5" /> Endereço de Instalação
                    </h2>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-3 space-y-2">
                            <Label htmlFor="street">Rua</Label>
                            <Input id="street" {...register("street")} placeholder="Rua das Flores" className="rounded-xl" />
                            {errors.street && <p className="text-xs text-red-500 font-medium">{errors.street.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="number">Nº</Label>
                            <Input id="number" {...register("number")} placeholder="123" className="rounded-xl" />
                            {errors.number && <p className="text-xs text-red-500 font-medium">{errors.number.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="neighborhood">Bairro</Label>
                            <Input id="neighborhood" {...register("neighborhood")} placeholder="Centro" className="rounded-xl" />
                            {errors.neighborhood && <p className="text-xs text-red-500 font-medium">{errors.neighborhood.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="zipCode">CEP</Label>
                            <Input id="zipCode" {...register("zipCode")} placeholder="00000-000" className="rounded-xl" />
                            {errors.zipCode && <p className="text-xs text-red-500 font-medium">{errors.zipCode.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="city">Cidade</Label>
                            <Input id="city" {...register("city")} placeholder="São Paulo" className="rounded-xl" />
                            {errors.city && <p className="text-xs text-red-500 font-medium">{errors.city.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="state">UF</Label>
                            <Input id="state" {...register("state")} placeholder="SP" maxLength={2} className="rounded-xl" />
                            {errors.state && <p className="text-xs text-red-500 font-medium">{errors.state.message}</p>}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <Alert variant="destructive" className="rounded-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 rounded-2xl">
                    <AlertCircle className="h-4 w-4 text-emerald-600" />
                    <AlertDescription>Perfil atualizado com sucesso!</AlertDescription>
                </Alert>
            )}

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]">
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" /> Salvar Alterações
                        </>
                    )}
                </Button>
            </div>
        </form>
    )
}
