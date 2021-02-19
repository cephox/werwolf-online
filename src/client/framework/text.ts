export function createHeader(type: "h1" | "h2" | "h3" | "h4" | "h5" | "h6", text: string, ...classes: string[]): HTMLHeadingElement {
    var header = document.createElement(type)
    classes.forEach(c => header.classList.add(c))
    header.textContent = text
    return header
}