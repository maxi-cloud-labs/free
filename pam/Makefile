QUIET = @echo '   CC' $@;
QUIETLINK = @echo 'LK' $@;
ifeq ($(Q)$(q), 0)
QUIET = 
QUIETLINK =
endif
MYCC = $(QUIET)gcc
MYLINKPP = $(QUIETLINK)gcc
#DEBUG = -g -fsanitize=address -fno-omit-frame-pointer -mno-omit-leaf-frame-pointer
PRE = ../build/_pam/
APP_VERSION=\"$(shell cat ../app/version.txt)\"

OBJs := $(PRE)cJSON.o $(PRE)pam.o

MYCFLAGS = $(CFLAGS) -DAPP_VERSION=$(APP_VERSION) -fPIC
MYLDFLAGS = -shared -fPIC -lcurl

.PHONY : clean

all: pre_build pam
clean: cleanup

pre_build:
	@mkdir -p $(PRE)

pam: $(OBJs)
	$(MYLINKPP) $(DEBUG) $(OBJs) $(MYLDFLAGS) -o pam_app.so
ifeq ($(DEBUG),)
	@strip pam_app.so
endif
ifeq ($(shell [ "$$(uname -m)" = "aarch64" ] || ischroot ; echo $$?), 0)
	@cp pam_app.so /usr/local/modules/pam/
endif

$(PRE)%.o : %.c
	$(MYCC) $(DEBUG) $< -o $@ -c $(MYCFLAGS)

cleanup:
	@rm -f $(OBJs) pam_app.so
