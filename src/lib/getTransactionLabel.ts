import { Expense, Obligation } from "@/hooks/useFinance";

/**
 * Единый формат отображения операции во всём приложении.
 *
 * Формат:
 *  - Расход обычный:     note || "Расход"
 *  - Расход обязательство: название обязательства || note || "Обязательство"
 *  - Доход:              note || "Доход"
 *  - Перевод/сбережение: "→ {toAccount}" (с какого счёта если нужно — через subtitle)
 */
export function getTransactionLabel(
  expense: Expense,
  obligations: Obligation[] = []
): string {
  switch (expense.type) {
    case "income":
      return expense.note || "Доход";

    case "obligation": {
      const obl = obligations.find((o) => o.id === expense.obligationId);
      return obl?.name || expense.note || "Обязательство";
    }

    case "transfer":
    case "savings":
      return expense.toAccount
        ? `→ ${expense.toAccount}`
        : expense.note || "Перевод";

    case "regular":
    default:
      return expense.note || "Расход";
  }
}

/**
 * Подзаголовок операции — откуда/куда.
 * Используется в EntityDetail для счетов и обязательств.
 */
export function getTransactionSubtitle(
  expense: Expense,
  viewingAccountName?: string
): string {
  const isTransfer =
    expense.type === "transfer" || expense.type === "savings";

  if (isTransfer) {
    if (viewingAccountName && expense.toAccount === viewingAccountName) {
      // Смотрим со стороны счёта-получателя
      return `← ${expense.account}`;
    }
    return expense.account;
  }

  return expense.account;
}
