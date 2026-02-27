// Updating the Obligation interface
interface Obligation {
    id: string;
    name: string;
    amount: number;
    monthlyPayment: number | null; // New field added
    paid: boolean;
    installments?: number[];
}

// Updating DEFAULT_STATE
const DEFAULT_STATE = {
    obligations: [
        { id: '1', name: 'Loan', amount: 1000, monthlyPayment: null, paid: false },
        // other obligations...
    ],
};

// Updating migrateState function
function migrateState(state) {
    return {
        ...state,
        obligations: state.obligations.map(obligation => ({
            ...obligation,
            monthlyPayment: obligation.monthlyPayment ?? null, // Ensure default null
        })),
    };
}

// Updating addObligation function
function addObligation(name, amount, monthlyPayment) {
    const newObligation = {
        id: generateId(),
        name,
        amount,
        monthlyPayment, // New parameter included
        paid: false,
    };
    // add to obligations...
}

// Updating updateObligation function
function updateObligation(id, updates) {
    const obligation = getObligationById(id);
    return {
        ...obligation,
        ...updates,
        monthlyPayment: updates.monthlyPayment ?? obligation.monthlyPayment, // Include update for monthlyPayment
    };
}

// Adding getMonthlyPaymentForObligation function
function getMonthlyPaymentForObligation(obligation) {
    return obligation.monthlyPayment; // Similar to getSavingsForAccount functionality
}