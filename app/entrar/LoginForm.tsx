"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Mail, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMagicLink, type AuthState } from "@/app/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" className="save-btn" disabled={pending}>
      {pending ? "Enviando…" : "Enviar enlace"}
      {!pending && <Mail aria-hidden size={14} strokeWidth={1.8} />}
    </Button>
  );
}

export default function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(sendMagicLink, {});

  if (state.sent) {
    return (
      <div className="auth-sent">
        <Check aria-hidden size={18} strokeWidth={2} />
        <p>
          Enlace enviado a <strong>{state.sent}</strong>. Ábrelo en este mismo
          navegador.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next} />
      <label>
        Correo
        <Input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="tunombre@correo.com"
          className="h-11 text-base"
        />
      </label>
      {state.error && <p className="admin-error">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
