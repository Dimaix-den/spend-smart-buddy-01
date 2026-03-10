// components/SavingsCarousel.tsx
import { PiggyBank } from "lucide-react";
import Carousel from "@/components/Carousel";
import { formatAmount } from "@/lib/formatAmount";

interface SavingsAccount {
  id: string;
  name: string;
  monthlyGoal?: number | null;
}

interface Obligation {
  id: string;
  name: string;
  totalAmount: number;
  monthlyPayment: number;
  paidMonths: number;
  paid: boolean;
}

interface SavingsCarouselProps {
  savingsAccounts: SavingsAccount[];
  getSavingsForAccount: (accountName: string) => number;
  obligations: Obligation[];
}

function ObligationsBlock({ obligations }: { obligations: Obligation[] }) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentObligations = obligations.filter((o) => {
    if (!o.dueDate) return true;
    const d = new Date(o.dueDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthlyTotal = currentObligations.reduce(
    (sum, o) => sum + o.monthlyPayment,
    0
  );

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-alert-orange/15">
            <span className="w-1.5 h-1.5 rounded-full bg-alert-orange" />
          </span>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Задолженности
          </h3>
        </div>
        {currentObligations.length > 0 && (
          <span className="text-xs font-semibold text-alert-orange font-tabular">
            {formatAmount(monthlyTotal)} ₸/мес
          </span>
        )}
      </div>

      {currentObligations.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          В этом месяце нет задолженностей.
        </p>
      ) : (
        <div className="space-y-2">
          {currentObligations.map((o) => {
            const isInstallment = o.totalAmount > o.monthlyPayment;
            const totalMonths = isInstallment
              ? Math.ceil(o.totalAmount / o.monthlyPayment)
              : 1;
            const paidMonths = o.paidMonths ?? 0;
            const progressPct = isInstallment
              ? Math.min(100, Math.round((paidMonths / totalMonths) * 100))
              : 0;

            return (
              <div key={o.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">{o.name}</p>
                  {isInstallment && (
                    <p className="text-[11px] text-muted-foreground">
                      {paidMonths} / {totalMonths} мес.
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-alert-orange font-tabular">
                    {formatAmount(o.monthlyPayment)} ₸
                  </p>
                  {isInstallment && (
                    <p className="text-[11px] text-muted-foreground">
                      {progressPct}%
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SavingsBlock({
  title,
  savingsAccounts,
  getSavingsForAccount,
}: {
  title: string;
  savingsAccounts: SavingsAccount[];
  getSavingsForAccount: (accountName: string) => number;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PiggyBank size={14} className="text-safe-green" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </h3>
        </div>
      </div>
      <div className="space-y-3">
        {savingsAccounts.map((acc) => {
          const saved = getSavingsForAccount(acc.name);
          const goal = acc.monthlyGoal || 0;
          const pct = goal > 0 ? Math.min(100, Math.round((saved / goal) * 100)) : 0;

          return (
            <div key={acc.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-foreground">{acc.name}</span>
                {goal > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatAmount(goal)} ₸/мес
                  </span>
                )}
              </div>
              {goal > 0 && (
                <>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "hsl(0 0% 23%)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: "hsl(162 100% 33%)" }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>
                      Отложено:{" "}
                      <span className="text-safe-green font-semibold">
                        {formatAmount(saved)} ₸
                      </span>
                    </span>
                    <span>{pct}%</span>
                  </div>
                </>
              )}
              {goal === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Цель не задана
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SavingsCarousel({
  savingsAccounts,
  getSavingsForAccount,
  obligations,
}: SavingsCarouselProps) {
  if (!savingsAccounts.length && !obligations.length) return null;

  return (
    <Carousel className="animate-fade-in-up px-4" showDots>
      {savingsAccounts.length > 0 && (
        <SavingsBlock
          title="Цель сбережений"
          savingsAccounts={savingsAccounts}
          getSavingsForAccount={getSavingsForAccount}
        />
      )}

      <ObligationsBlock obligations={obligations} />
    </Carousel>
  );
}
