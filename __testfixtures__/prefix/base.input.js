// eslint-disable-next-line import/no-unresolved
import React from 'react';
import style from './index.module.scss';

export const User = () => (
  <div className={style.header}>
    <div className={style.user}>
      <img className={style.avatar} alt="avatar" />
      <span className={style.username}>username</span>
    </div>
  </div>
);