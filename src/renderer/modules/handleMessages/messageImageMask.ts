function messageImageMask(component: any) {
  // log(component.props.msgRecord.senderUin)
  // log(component?.vnode?.el);
  if (1) {
    component.vnode.el.querySelectorAll(".pic-element").forEach((el: HTMLDivElement) => {
      el.classList.add("lt-pic-mask");
    });
  }
}

export { messageImageMask };
