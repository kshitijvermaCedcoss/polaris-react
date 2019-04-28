import React from 'react';
import {classNames} from '../../../../utilities/css';
import styles from '../../Tabs.scss';

export interface Props {
  hidden?: boolean;
  id: string;
  tabID: string;
  children?: React.ReactNode;
}

/** @uxpinnamespace Tabs */
export default function Panel({hidden, id, tabID, children}: Props) {
  const className = classNames(styles.Panel, hidden && styles['Panel-hidden']);
  return (
    <div
      className={className}
      id={id}
      role="tabpanel"
      aria-labelledby={tabID}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
