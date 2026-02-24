import { redirect } from "next/navigation";

export default function GlobalNotFound() {
    // Redireciona qualquer rota 404 para a página inicial
    redirect("/overview");
}
