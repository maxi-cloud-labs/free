#ifndef LANGUAGE_H
#define LANGUAGE_H

//Define
#define NB_LANG 9

//Struct
typedef struct mylanguage {
	char *language;
	char *code;
} mylanguage;

//Global variable
extern mylanguage mylanguages[NB_LANG];

//Global functions
unsigned char *LL(unsigned char *a, int b);
unsigned char *L(unsigned char *a);
void languageTest();
void languagePrepare();

#endif
