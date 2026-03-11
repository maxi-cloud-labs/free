#ifndef DISKNOTIFY_H
#define DISKNOTIFY_H

//Global functions
void diskNotifyCB(int fdNotify, void (*cb)());
int diskNotifyStart(char *sz);
int diskNotifyStop();

#endif
