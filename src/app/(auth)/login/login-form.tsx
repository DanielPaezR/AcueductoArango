"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";

export function LoginForm() {
  const [estado, accion, pendiente] = useActionState(login, undefined);
  return (
    <form action={accion} className="space-y-5">
      <div>
        <label className="label" htmlFor="username">Usuario</label>
        <input
          id="username"
          name="username"
          className="input"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={estado?.valores?.username}
          key={estado?.valores?.username}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      {estado?.error && (
        <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">
          {estado.error}
        </p>
      )}
      <button className="btn-primario w-full" disabled={pendiente}>
        {pendiente ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
