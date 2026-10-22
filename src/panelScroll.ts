// A forecast can open after the rose click and resize the list while its
// smooth scroll is still running. Recalculate the destination from live bounds.
export function revealPanelCard(list: HTMLElement, card: HTMLElement) {
    let active = true;
    let destination: number | undefined;
    const interrupts = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
    const resize = new ResizeObserver(align);

    function stop() {
        if (!active) return;
        active = false;
        resize.disconnect();
        for (const event of interrupts) list.removeEventListener(event, stop);
    }

    function align() {
        if (!active) return;
        if (!list.isConnected || !card.isConnected || !list.contains(card)) { stop(); return; }
        const bounds = list.getBoundingClientRect(), target = card.getBoundingClientRect();
        if (bounds.height <= 0) return;
        const top = Math.max(0, Math.min(list.scrollHeight - list.clientHeight,
            list.scrollTop + target.top - bounds.top - Math.max(0, (bounds.height - target.height) / 2)));
        if (destination !== undefined && Math.abs(top - destination) < 0.5) return;
        destination = top;
        list.scrollTo({top, behavior:'smooth'});
    }

    resize.observe(list);
    resize.observe(card);
    for (const event of interrupts) list.addEventListener(event, stop, {passive:true});
    align();
    return stop;
}
