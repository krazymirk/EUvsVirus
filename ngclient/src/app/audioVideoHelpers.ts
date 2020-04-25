export function destroyStream(stream: MediaStream) {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
    }
}

export function changeDomStream(stream: MediaStream, dom: HTMLMediaElement) {
    if ('srcObject' in dom) {
        dom.srcObject = stream;
    } else {
        (dom as any).src = window.URL.createObjectURL(stream); // for older browsers
    }

    dom.play();
}
