"use client"

const ExploreBtn = () => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        const eventsSection = document.getElementById('browse-all-events-btn');
        if (eventsSection) {
            eventsSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    };

    return (
        <button 
            type="button" 
            id="explore-btn" 
            className="bg-dark-100 hover:bg-dark-100/90 text-foreground border border-blue/20 hover:border-blue/40 px-8 py-3.5 rounded-full hover:scale-110 transition-all duration-300 shadow-lg font-semibold flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-[240px] cursor-pointer" 
            onClick={handleClick}
        >
            <span className="text-foreground">Explore Events</span>
            <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </button>
    )
}

export default ExploreBtn