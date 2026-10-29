const escape=(value: string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const title=(name: string,visible: boolean)=>`${visible?'Hide':'Show'} large wind rose: ${name}`;
function contents(name: string,visible: boolean) {
    return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>${visible?'':'<path d="m3 3 18 18"/>'}</svg><span class="rose-toggle-label">${visible?'Hide rose':`Show ${escape(name)}`}</span>`;
}
export function roseControlHTML(name: string,visible: boolean) {
    return `<button class="rose-visibility-toggle" type="button" aria-label="${escape(title(name,visible))}" title="${escape(title(name,visible))}" aria-pressed="${visible}">${contents(name,visible)}</button>`;
}
export function updateRoseControl(button: HTMLButtonElement | null | undefined,name: string,visible: boolean) {
    if(!button)return;
    button.title=title(name,visible);button.setAttribute('aria-label',title(name,visible));button.setAttribute('aria-pressed',String(visible));
    button.innerHTML=contents(name,visible);
}
