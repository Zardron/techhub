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
        <button type="button" id="explore-btn" className="mt-7 mx-auto hover:scale-110 hover:shadow-lg transition-all duration-300" onClick={handleClick}>
            <span className="inline-block">Explore Events ↓</span>
        </button>
    )
}

export default ExploreBtn