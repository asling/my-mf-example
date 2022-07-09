import { SLSelect } from '@yy/sl-admin-components';

if (a === SLSelect) {}
if (SLSelect) {}

SLSelect ? 'a' : 'b';
a ? SLSelect : 2;

SLSelect || 'a';
a || SLSelect;
