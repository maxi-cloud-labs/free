#ifndef COMAUTH_H
#define COMAUTH_H

//Global functions
int serverWriteDataAuth(unsigned char *data, int size);
int serverForwardDataAuth(char *sz);
void communicationAuth();

#endif
