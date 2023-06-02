
import React from 'react';
import './AuthButton.css';

const AuthButton = ({ isAuthenticated, onLogout, onLogin }) => {
    return (
        <div className="auth-button">
            {isAuthenticated ? (
                <button onClick={onLogout}>Logout</button>
            ) : (
                <button onClick={onLogin}>Login</button>
            )}
        </div>
    );
};

export default AuthButton;
