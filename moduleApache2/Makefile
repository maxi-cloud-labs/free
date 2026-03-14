QUIET = @echo '   CC' $@;
QUIETLINK = @echo 'LK' $@;
ifeq ($(Q)$(q), 0)
QUIET = 
QUIETLINK =
endif
PREPARG = -m
ifeq ($(Q)$(d), 1)
	PREPARG =
endif
MYCC = $(QUIET)gcc
MYLINKPP = $(QUIETLINK)gcc
#DEBUG = -g -fsanitize=address -fno-omit-frame-pointer -mno-omit-leaf-frame-pointer
PRE = ../build/_moduleapache/
APP_VERSION=\"$(shell cat ../app/version.txt)\"

OBJs := $(PRE)module.o \
	$(PRE)cJSON.o \
	$(PRE)json.o \
	$(PRE)login_.o

MYCFLAGS = $(CFLAGS) -DAPP_VERSION=$(APP_VERSION) -Wformat-truncation -O2 -flto=auto -ffat-lto-objects -I/usr/include/apache2 -fPIC -DPIC `pkg-config --cflags apr-1`
MYLDFLAGS = -shared -fPIC -DPIC -flto=auto -Wl,--as-needed -Wl,-Bsymbolic-functions -Wl,-soname -Wl,mod_app.so -ljwt

.PHONY : clean

all: pre_build module
clean: cleanup

pre_build:
	@mkdir -p $(PRE)

module: $(OBJs)
	$(MYLINKPP) $(DEBUG) $(OBJs) $(MYLDFLAGS) -o mod_app.so
ifeq ($(DEBUG),)
	@strip mod_app.so
endif
ifeq ($(shell [ "$$(uname -m)" = "aarch64" ] || ischroot ; echo $$?), 0)
	@cp mod_app.so /usr/local/modules/apache2/
endif
	@rm -f $(PRE)login_.o

login_.c: login_.c.gen_trigger
login_.c.gen_trigger:
	./prepare.sh $(PREPARG)
$(PRE)login_.o : login_.c
	$(MYCC) $(DEBUG) $< -o $@ -c $(MYCFLAGS)

$(PRE)%.o : %.c
	$(MYCC) $(DEBUG) $< -o $@ -c $(MYCFLAGS)

cleanup:
	@rm -f $(OBJs) login_.c mod_app.so
