/**
 * Maps Supabase Auth error codes to clear Brazilian Portuguese messages.
 */
export function mapAuthError(code: string | undefined, message?: string): string {
  switch (code) {
    case "invalid_credentials":
      return "E-mail ou senha incorretos. Confira e tente novamente.";
    case "email_not_confirmed":
      return "Confirme seu e-mail antes de entrar. Veja a mensagem que enviamos para você.";
    case "user_not_found":
      return "Não encontramos uma conta com este e-mail.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
    case "same_password":
      return "A nova senha precisa ser diferente da atual.";
    case "user_banned":
      return "Esta conta está suspensa. Fale com o suporte.";
    default:
      if (message?.includes("Failed to fetch")) {
        return "Sem conexão com o servidor. Verifique sua internet.";
      }
      return "Algo deu errado. Tente novamente em instantes.";
  }
}

/** Checks password strength rules used by signup and reset forms. */
export function validatePassword(password: string): string | null {
  if (password.length < 8) return "A senha precisa de pelo menos 8 caracteres.";
  if (!/[a-zA-Z]/.test(password))
    return "A senha precisa conter pelo menos uma letra.";
  if (!/\d/.test(password)) return "A senha precisa conter pelo menos um número.";
  return null;
}
