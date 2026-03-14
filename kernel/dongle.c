#include <linux/init.h>
#include <linux/kernel.h>
#include <linux/module.h>
#include <linux/gpio.h>
#include <linux/of_gpio.h>
#include <linux/i2c.h>
#include <linux/platform_device.h>
#include <linux/pwm.h>
#include <linux/delay.h>
#include <linux/syscalls.h>
#include <linux/kernel_stat.h>
#include <linux/version.h>

#define LOG_ERROR 1
#define LOG_INFO 2
#define LOG_VERBOSE 3

struct donglePriv {
	int debug;
	int buzzerCount;
	struct pwm_device *buzzerS;
	int buzzerON;
	int buzzerFreq;
	struct work_struct workBuzzer;
	char model[32];
	int hardwareVersion;
	int ccnrst;
};

static struct donglePriv *myip;
static struct timer_list my_timer_buzzer;

static void dongle_workBuzzer(struct work_struct *w) {
	struct donglePriv *ip = container_of(w, struct donglePriv, workBuzzer);
	if (ip->buzzerON) {
		pwm_config(ip->buzzerS, 166000, 322000);
		pwm_enable(ip->buzzerS);
	} else
		pwm_disable(ip->buzzerS);
}

static int inBuzzer;
static void buzzer_(struct donglePriv *ip, int enable) {
	ip->buzzerON = enable;
	if (enable)
		inBuzzer = 1;
	schedule_work(&ip->workBuzzer);
}

#if LINUX_VERSION_CODE < KERNEL_VERSION(4,14,0)
static void my_timer_buzzer_callback(unsigned long data) {
#else
static void my_timer_buzzer_callback(struct timer_list *tl) {
#endif
	struct donglePriv *ip = myip;
	if (ip->buzzerCount >= 0)
		ip->buzzerCount--;
	if (ip->buzzerCount >= 0)
		buzzer_(ip, ip->buzzerCount % 2);
	if (ip->buzzerCount >= 0)
		mod_timer(&my_timer_buzzer, jiffies + msecs_to_jiffies(100));
	else
		inBuzzer = 0;
}

static ssize_t write_buzzer(struct device *dev, struct device_attribute *attr, const char *buf, size_t count) {
	struct donglePriv *ip = dev_get_drvdata(dev);
	unsigned long i;
        if (kstrtoul(buf, 10, &i))
		return -EINVAL;

	ip->buzzerCount = i == 2 ? 1 : i;
	mod_timer(&my_timer_buzzer, jiffies + msecs_to_jiffies(i == 2 ? 300 : i == 1 ? 150 : 100));
	buzzer_(ip, 1);
	return count;
}

static DEVICE_ATTR(buzzer, 0220, NULL, write_buzzer);

static ssize_t write_buzzerFreq(struct device *dev, struct device_attribute *attr, const char *buf, size_t count) {
	struct donglePriv *ip = dev_get_drvdata(dev);
	unsigned long i;
        if (kstrtoul(buf, 10, &i))
		return -EINVAL;
	if (i == 0)
		pwm_disable(ip->buzzerS);
	else {
		long f = 1000 * 1000 * 1000 / i;
		pwm_config(ip->buzzerS, f / 2, f);
		pwm_enable(ip->buzzerS);
	}
	return count;
}

static DEVICE_ATTR(buzzerFreq, 0220, NULL, write_buzzerFreq);

static ssize_t show_model(struct device *dev, struct device_attribute *attr, char *buf) {
	struct donglePriv *ip = dev_get_drvdata(dev);
	return sprintf(buf, "%s", ip->model);
}

static DEVICE_ATTR(model, 0440, show_model, NULL);

static ssize_t show_hardwareVersion(struct device *dev, struct device_attribute *attr, char *buf) {
	struct donglePriv *ip = dev_get_drvdata(dev);
	return sprintf(buf, "%u\n", ip->hardwareVersion);
}

static DEVICE_ATTR(hardwareVersion, 0440, show_hardwareVersion, NULL);

static ssize_t show_serial(struct device *dev, struct device_attribute *attr, char *buf) {
	struct donglePriv *ip = dev_get_drvdata(dev);
	if (strcmp(ip->model, "Dongle Pro") == 0 || strstr(ip->model, "Raspberry Pi") != NULL) {
		const char *sz = NULL;
		of_property_read_string(of_root, "serial-number", &sz);
		return sprintf(buf, "%s", sz);
	} else if (strcmp(ip->model, "Dongle Std") == 0) {
#define ADDRESS_ID 0xC0067000
		void __iomem *regs = ioremap(ADDRESS_ID + 0x04, 4);
		char szSerial[17];
		sprintf(szSerial, "%08x", readl(regs));
		iounmap(regs);
		return sprintf(buf, "%s", szSerial);
	} else
		return sprintf(buf, "1234567890abcdef");
}

static DEVICE_ATTR(serial, 0440, show_serial, NULL);

static ssize_t show_debug(struct device *dev, struct device_attribute *attr, char *buf) {
	struct donglePriv *ip = dev_get_drvdata(dev);
	return sprintf(buf, "%u\n", ip->debug);
}

static ssize_t write_debug(struct device *dev, struct device_attribute *attr, const char *buf, size_t count) {
	struct donglePriv *ip = dev_get_drvdata(dev);
	unsigned long i;
        if (kstrtoul(buf, 10, &i))
		return -EINVAL;

	ip->debug = i;
	return count;
}

static DEVICE_ATTR(debug, 0660, show_debug, write_debug);

static ssize_t write_printk(struct device *dev, struct device_attribute *attr, const char *buf, size_t count) {
	printk("Dongle: %s", buf);
	if (strlen(buf) > 0 && buf[strlen(buf) - 1] != '\n')
		printk("\n");
	return count;
}

static DEVICE_ATTR(printk, 0220, NULL, write_printk);

static ssize_t show_ccreset(struct device *dev, struct device_attribute *attr, char *buf) {
	struct donglePriv *ip = dev_get_drvdata(dev);
	return sprintf(buf, "%u\n", !gpio_get_value(ip->ccnrst));
}

static ssize_t write_ccreset(struct device *dev, struct device_attribute *attr, const char *buf, size_t count) {
	struct donglePriv *ip = dev_get_drvdata(dev);
	unsigned long i;
		if (kstrtoul(buf, 10, &i))
		return -EINVAL;

	gpio_set_value(ip->ccnrst, !i);
	return count;
}

static DEVICE_ATTR(ccreset, 0660, show_ccreset, write_ccreset);

static ssize_t write_buzzerClick(struct device *dev, struct device_attribute *attr, const char *buf, size_t count) {
	struct donglePriv *ip = dev_get_drvdata(dev);
	unsigned long i;
        if (kstrtoul(buf, 10, &i))
		return -EINVAL;

	pwm_config(ip->buzzerS, 75000 / 2, 75000);
	pwm_enable(ip->buzzerS);
	udelay(i);
	pwm_disable(ip->buzzerS);
	return count;
}

static DEVICE_ATTR(buzzerClick, 0220, NULL, write_buzzerClick);

static struct attribute *dongle_attributes[] = {
	&dev_attr_buzzer.attr,
	&dev_attr_buzzerFreq.attr,
	&dev_attr_model.attr,
	&dev_attr_hardwareVersion.attr,
	&dev_attr_serial.attr,
	&dev_attr_debug.attr,
	&dev_attr_printk.attr,
	&dev_attr_ccreset.attr,
	&dev_attr_buzzerClick.attr,
	NULL,
};

static struct attribute_group dongle_attr_group = {
	.attrs = dongle_attributes,
};

int isDongle = 0;
static int dongle_probe(struct platform_device *pdev) {
	int ret;
	struct device *dev = &pdev->dev;
	struct donglePriv *ip = devm_kzalloc(dev, sizeof(struct donglePriv), GFP_KERNEL);
	if (!ip)
		return -ENOMEM;
	printk("Dongle: Enter probe\n");

	isDongle = 1;
	platform_set_drvdata(pdev, ip);
	myip = (struct donglePriv *)ip;
	ip->debug = 0;
	const char *mm;
	of_property_read_string(of_root, "model", &mm); //Raspberry Pi Compute Module 5 Rev 1.0
/*
	const char *cc;
	of_property_read_string(of_root, "compatible", &cc); //Raspberry Pi Compute Module 5 Rev 1.0
	struct device_node *root = of_find_node_by_path("/");
	int len;
	const char *compat;
    compat = of_get_property(root, "compatible", &len); //raspberrypi,5-compute-module
	const char *compat_str;
	int i = 0;
	while (of_property_read_string_index(root, "compatible", i++, &compat_str) == 0)
		; //raspberrypi,5-compute-module  brcm,bcm2712
*/
	strcpy(ip->model, strstr(mm, "Raspberry Pi Compute Module 5") != NULL ? "Dongle Pro" : strstr(mm, "Raspberry Pi") != NULL ? "Raspberry Pi" : "Dongle Std");
	ip->hardwareVersion = 10;
	ip->buzzerCount = 0;
	INIT_WORK(&ip->workBuzzer, dongle_workBuzzer);

	if (strcmp(ip->model, "Dongle Pro") == 0)
		ip->buzzerS = pwm_get(&pdev->dev, NULL);
	else {
#if LINUX_VERSION_CODE < KERNEL_VERSION(4,14,0)
		int pwmBuzzer;
		of_property_read_u32(dev->of_node, "pwm_buzzer", &pwmBuzzer);
		ip->buzzerS = pwm_request(pwmBuzzer, "PWM_BUZZER");
		pwm_config(ip->buzzerS, 166000, 322000);
#endif
	}
	if (IS_ERR(ip->buzzerS))
		printk("Dongle: Requesting PWM failed\n");

#if LINUX_VERSION_CODE < KERNEL_VERSION(4,14,0)
#define timer_setup setup_timer
#endif
	timer_setup(&my_timer_buzzer, my_timer_buzzer_callback, 0);

#if LINUX_VERSION_CODE <= KERNEL_VERSION(6,0,0)
	ip->ccnrst = of_get_gpio(dev->of_node, 0);
#else
	struct device_node *node = of_find_compatible_node(NULL, NULL, "dongle");
	of_property_read_u32(node, "ccnrst", &ip->ccnrst);
	ip->ccnrst += 569;
#endif
	ret = gpio_request(ip->ccnrst, "CCNRST");
	if (ret < 0) {
		printk("Dongle: Failed to request GPIO %d for CCNRST\n", ip->ccnrst);
		//return 0;
	}
	gpio_direction_output(ip->ccnrst, 1);

	ret = sysfs_create_group(&dev->kobj, &dongle_attr_group);
	kuid_t new_uid;
	kgid_t new_gid;
	new_uid = make_kuid(&init_user_ns, 0);
	new_gid = make_kgid(&init_user_ns, 100);
	ret = sysfs_file_change_owner(&dev->kobj, "buzzer", new_uid, new_gid);
	ret = sysfs_file_change_owner(&dev->kobj, "buzzerClick", new_uid, new_gid);
	ret = sysfs_file_change_owner(&dev->kobj, "buzzerFreq", new_uid, new_gid);
	ret = sysfs_file_change_owner(&dev->kobj, "ccreset", new_uid, new_gid);
	ret = sysfs_file_change_owner(&dev->kobj, "hardwareVersion", new_uid, new_gid);
	ret = sysfs_file_change_owner(&dev->kobj, "model", new_uid, new_gid);
	ret = sysfs_file_change_owner(&dev->kobj, "printk", new_uid, new_gid);
	ret = sysfs_file_change_owner(&dev->kobj, "serial", new_uid, new_gid);
	printk("Dongle: Exit probe\n");
	return ret;
}

#if LINUX_VERSION_CODE <= KERNEL_VERSION(6,12,0)
static int dongle_remove(struct platform_device *pdev) {
#else
static void dongle_remove(struct platform_device *pdev) {
#endif
	int ret;

	ret = del_timer(&my_timer_buzzer);
	if (ret)
		printk("Dongle: Timer buzzer still in use\n");

	sysfs_remove_group(NULL, &dongle_attr_group);
#if LINUX_VERSION_CODE <= KERNEL_VERSION(6,12,0)
	return 0;
#endif
}

static const struct of_device_id dongle_of[] = {
    { .compatible = "dongle", },
    {},
};
MODULE_DEVICE_TABLE(of, dongle_of);

static struct platform_driver dongle_driver = {
	.driver = {
		.name = "dongle",
		.of_match_table = of_match_ptr(dongle_of),
	},
	.probe = dongle_probe,
	.remove = dongle_remove,
};

static int __init dongle_init(void) {
	return platform_driver_register(&dongle_driver);
}
module_init(dongle_init);

static void __exit dongle_exit(void) {
	platform_driver_unregister(&dongle_driver);
}
module_exit(dongle_exit);

MODULE_DESCRIPTION("Driver");
MODULE_AUTHOR("Gregoire Gentil");
MODULE_LICENSE("GPL");
