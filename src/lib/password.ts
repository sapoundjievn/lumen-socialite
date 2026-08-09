/** Strong password rules for Lumen · Socialite signup */

export type PasswordCheck = {
  ok: boolean;
  score: number; // 0–4
  messages: string[];
};

export function checkPasswordStrength(password: string): PasswordCheck {
  const messages: string[] = [];
  let score = 0;

  if (password.length >= 10) score++;
  else messages.push("At least 10 characters");

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else messages.push("Upper and lower case letters");

  if (/\d/.test(password)) score++;
  else messages.push("At least one number");

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else messages.push("At least one symbol (!@#$%…)");

  return {
    ok: score >= 3 && password.length >= 10,
    score,
    messages,
  };
}
