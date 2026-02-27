import React from 'react';
import { useEffect, useState } from 'react';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';

const Capital = ({ accounts, obligations, savings }) => {
    const [filteredAccounts, setFilteredAccounts] = useState([]);

    useEffect(() => {
        // Logic to filter active and inactive accounts
        const activeAccounts = accounts.filter(account => account.active);
        setFilteredAccounts(activeAccounts);
    }, [accounts]);

    return (
        <div>
            <h1>Capital</h1>
            <h2>Active Accounts</h2>
            {/* Existing code for displaying active accounts */}

            <h2>Savings</h2>
            {/* Existing code for displaying savings */}

            <h2>Obligations</h2>
            <div className="obligations">
                {obligations.map((obligation, index) => (
                    <Card key={index} onClick={() => editObligation(obligation)}>  {/* Add click function to edit obligation */}
                        <h3>{obligation.name}</h3>
                        <ProgressBar completed={obligation.progress} />
                        <p>Monthly Payment: ${obligation.monthlyPayment}</p>
                        <p>Total Amount: ${obligation.totalAmount}</p>
                    </Card>
                ))}
            </div>

            <h2>Inactive Accounts</h2>
            {/* Existing code for displaying inactive accounts */}
        </div>
    );
};

const editObligation = (obligation) => {
    // Logic for editing the obligation
};

export default Capital;