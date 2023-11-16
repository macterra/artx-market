import React, { useState, useEffect } from 'react';
import { Button } from "@mui/material";

function ScrollToTopButton() {
    const [isVisible, setIsVisible] = useState(false);

    // Show button when page is scrolled down
    useEffect(() => {
        const checkScroll = () => {
            if (!isVisible && window.scrollY > 0) {
                setIsVisible(true);
            } else if (isVisible && window.scrollY <= 0) {
                setIsVisible(false);
            }
        };

        // Listen for scroll events
        window.addEventListener('scroll', checkScroll);

        return () => {
            // Clean up the listener
            window.removeEventListener('scroll', checkScroll);
        };
    }, [isVisible]);

    return isVisible ? (
        <Button onClick={() => window.scrollTo(0, 0)}>
            Scroll to top
        </Button>
    ) : null;
}

function ContentFooter() {
    return (
        <div style={{ height: '80px' }}>
            <ScrollToTopButton />
        </div>
    );
}

export default ContentFooter;
