/* Renders a Material Symbols Outlined icon (the design system's icon font).
 * Usage: <Icon name="trending_up" /> or <Icon name="home" filled /> */
export default function Icon({ name, filled = false, className = '', style, ...rest }) {
  return (
    <span
      className={`material-symbols-outlined select-none${filled ? ' fill-icon' : ''}${
        className ? ` ${className}` : ''
      }`}
      style={style}
      aria-hidden="true"
      {...rest}
    >
      {name}
    </span>
  );
}
