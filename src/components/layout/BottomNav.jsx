import { NavLink } from 'react-router-dom'

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink
        to="/roster"
        className={({ isActive }) =>
          'bottom-nav__item' + (isActive ? ' bottom-nav__item--active' : '')
        }
      >
        <span className="bottom-nav__icon">👥</span>
        <span>Roster</span>
      </NavLink>

      <NavLink
        to="/games"
        className={({ isActive }) =>
          'bottom-nav__item' + (isActive ? ' bottom-nav__item--active' : '')
        }
      >
        <span className="bottom-nav__icon">⚾</span>
        <span>Games</span>
      </NavLink>

      <NavLink
        to="/stats"
        className={({ isActive }) =>
          'bottom-nav__item' + (isActive ? ' bottom-nav__item--active' : '')
        }
      >
        <span className="bottom-nav__icon">📊</span>
        <span>Stats</span>
      </NavLink>
    </nav>
  )
}
