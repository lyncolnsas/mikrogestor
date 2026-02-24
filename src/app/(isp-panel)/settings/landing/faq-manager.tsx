"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { createFAQAction, deleteFAQAction } from "@/modules/saas/actions/testimonial-faq.actions";
import { toast } from "sonner";

interface FAQ {
    id: string;
    question: string;
    answer: string;
    order: number;
}

interface FAQManagerProps {
    faqs: FAQ[];
}

export function FAQManager({ faqs: initialFAQs }: FAQManagerProps) {
    const [faqs, setFaqs] = useState(initialFAQs);
    const [isAdding, setIsAdding] = useState(false);
    const [newFAQ, setNewFAQ] = useState({
        question: "",
        answer: "",
        order: faqs.length
    });

    async function handleAdd() {
        const result = await createFAQAction(newFAQ);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("FAQ adicionada!");
            setFaqs([...faqs, result.data!]);
            setNewFAQ({ question: "", answer: "", order: faqs.length + 1 });
            setIsAdding(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Remover esta pergunta?")) return;
        const result = await deleteFAQAction(id);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("FAQ removida!");
            setFaqs(faqs.filter(f => f.id !== id));
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-700">Perguntas Frequentes (FAQ)</h4>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAdding(!isAdding)}
                    className="gap-2"
                >
                    <Plus size={16} /> Adicionar
                </Button>
            </div>

            {isAdding && (
                <Card className="border-2 border-blue-200">
                    <CardContent className="p-4 space-y-3">
                        <div>
                            <Label className="text-xs">Pergunta</Label>
                            <Input
                                placeholder="Qual o prazo de instalação?"
                                value={newFAQ.question}
                                onChange={(e) => setNewFAQ({ ...newFAQ, question: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Resposta</Label>
                            <Textarea
                                placeholder="A instalação é realizada em até 48 horas..."
                                className="resize-none h-24"
                                value={newFAQ.answer}
                                onChange={(e) => setNewFAQ({ ...newFAQ, answer: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleAdd} size="sm" className="flex-1">Salvar</Button>
                            <Button onClick={() => setIsAdding(false)} size="sm" variant="ghost">Cancelar</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-3">
                {faqs.map((faq, index) => (
                    <Card key={faq.id} className="border border-slate-200">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-start gap-2">
                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">#{index + 1}</span>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900">{faq.question}</p>
                                            <p className="text-sm text-slate-600 mt-1">{faq.answer}</p>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(faq.id)}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {faqs.length === 0 && !isAdding && (
                    <p className="text-sm text-slate-400 italic text-center py-4">Nenhuma FAQ cadastrada</p>
                )}
            </div>
        </div>
    );
}
