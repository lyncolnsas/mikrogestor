"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Star, Pencil } from "lucide-react";
import { createTestimonialAction, deleteTestimonialAction, updateTestimonialAction } from "@/modules/saas/actions/testimonial-faq.actions";
import { toast } from "sonner";

interface Testimonial {
    id: string;
    customerName: string;
    customerRole?: string | null;
    content: string;
    rating: number;
    avatarUrl?: string | null;
}

interface TestimonialManagerProps {
    testimonials: Testimonial[];
}

export function TestimonialManager({ testimonials: initialTestimonials }: TestimonialManagerProps) {
    const [testimonials, setTestimonials] = useState(initialTestimonials);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        customerName: "",
        customerRole: "",
        content: "",
        rating: 5,
        avatarUrl: ""
    });

    // Validar se initialTestimonials mudou (ex: revalidatePath do servidor)
    useEffect(() => {
        setTestimonials(initialTestimonials);
    }, [initialTestimonials]);

    function resetForm() {
        setFormData({ customerName: "", customerRole: "", content: "", rating: 5, avatarUrl: "" });
        setEditingId(null);
        setIsAdding(false);
    }

    function startEditing(testimonial: Testimonial) {
        setFormData({
            customerName: testimonial.customerName,
            customerRole: testimonial.customerRole || "",
            content: testimonial.content,
            rating: testimonial.rating,
            avatarUrl: testimonial.avatarUrl || ""
        });
        setEditingId(testimonial.id);
        setIsAdding(true);
    }

    async function handleSave() {
        if (editingId) {
            // Update
            const result = await updateTestimonialAction({ ...formData, id: editingId });
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Depoimento atualizado!");
                // Opcional: atualizar state localmente enquanto revalidate acontece
                setTestimonials(testimonials.map(t => t.id === editingId ? result.data! : t));
                resetForm();
            }
        } else {
            // Create
            const result = await createTestimonialAction(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Depoimento adicionado!");
                setTestimonials([result.data!, ...testimonials]);
                resetForm();
            }
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Remover este depoimento?")) return;
        const result = await deleteTestimonialAction(id);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Depoimento removido!");
            setTestimonials(testimonials.filter(t => t.id !== id));
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-700">Depoimentos de Clientes</h4>
                <div className="flex gap-2">
                    {isAdding && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={resetForm}
                        >
                            Cancelar
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant={isAdding ? "default" : "outline"}
                        onClick={() => {
                            if (isAdding && !editingId) resetForm(); // Se já estava adicionando, verifica.
                            else {
                                resetForm();
                                setIsAdding(true);
                            }
                        }}
                        className="gap-2"
                        disabled={isAdding && !editingId}
                    >
                        <Plus size={16} /> Adicionar
                    </Button>
                </div>
            </div>

            {isAdding && (
                <Card className="border-2 border-blue-200 animate-in fade-in slide-in-from-top-2">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold uppercase text-blue-600">
                                {editingId ? "Editar Depoimento" : "Novo Depoimento"}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Nome do Cliente</Label>
                                <Input
                                    placeholder="João Silva"
                                    value={formData.customerName}
                                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Profissão (Opcional)</Label>
                                <Input
                                    placeholder="Empresário"
                                    value={formData.customerRole}
                                    onChange={(e) => setFormData({ ...formData, customerRole: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs">Depoimento</Label>
                            <Textarea
                                placeholder="Melhor internet que já tive..."
                                className="resize-none h-20"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Avaliação (1-5)</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={formData.rating}
                                    onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) || 5 })}
                                />
                            </div>
                            <div>
                                <Label className="text-xs">URL Avatar (Opcional)</Label>
                                <Input
                                    placeholder="https://..."
                                    value={formData.avatarUrl}
                                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button onClick={handleSave} size="sm" className="flex-1 font-bold">
                                {editingId ? "Salvar Alterações" : "Adicionar Depoimento"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-3">
                {testimonials.map((testimonial) => (
                    <Card key={testimonial.id} className={`border transition-all ${editingId === testimonial.id ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300'}`}>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 cursor-pointer" onClick={() => startEditing(testimonial)}>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-900">{testimonial.customerName}</p>
                                        {testimonial.customerRole && (
                                            <span className="text-xs text-slate-500">• {testimonial.customerRole}</span>
                                        )}
                                    </div>
                                    <div className="flex gap-1 my-1">
                                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                                            <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />
                                        ))}
                                    </div>
                                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">{testimonial.content}</p>
                                </div>
                                <div className="flex gap-1 pl-2">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                        onClick={() => startEditing(testimonial)}
                                    >
                                        <Pencil size={14} />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleDelete(testimonial.id)}
                                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {testimonials.length === 0 && !isAdding && (
                    <p className="text-sm text-slate-400 italic text-center py-4">Nenhum depoimento cadastrado</p>
                )}
            </div>
        </div>
    );
}
