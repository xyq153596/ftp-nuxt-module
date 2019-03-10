const fse = require("fs-extra");
const node_ssh = require("node-ssh");
const consola = require("consola");
const chalk = require("chalk");

const ssh = new node_ssh();

async function asyncModule() {
  const { buildEnv } = this.options.global;
  if (buildEnv !== "dev") {
    return;
  }
  
  this.nuxt.hook("generate:done", async nuxt => {
    const ftp_config = nuxt.options.project.ftp;
    const ssh_config = {
      host: ftp_config.host,
      username: ftp_config.username,
      password: ftp_config.password,
      port: ftp_config.port
    };
    const distDir = nuxt.options.generate.dir;
    const isExist = await fse.pathExists(distDir);
    if (isExist) {
      try {
        await ssh.connect(ssh_config);
      } catch (error) {
        consola.error(chalk.red("测试服务器连接失败，上传代码没有成功"));
        return Promise.resolve();
      }
      //清空目标目录
      await ssh.execCommand(
        `rm -rf ${ftp_config.dir}/${nuxt.options.project.dirName}/`
      );
      consola.info("正在将代码上传至测试服务器。。。");
      //上传代码
      const result = await ssh.putDirectory(
        distDir,
        `${ftp_config.dir}/${nuxt.options.project.dirName}/${
          nuxt.options.project.version.nextDev
        }`,
        {
          recursive: true,
          concurrency: 1,
          tick(local, remote, error) {
            if (error) {
              consola.error(local);
            } else {
              consola.success(local, "->", remote);
            }
          }
        }
      );
      if (result) {
        consola.success(`上传代码成功!`);
        consola.info("最新测试版本", `${nuxt.options.project.version.nextDev}`);
        consola.info("最新测试地址", `${nuxt.options.build.publicPath}`);
      } else {
        consola.error("上传失败，请重新上传");
      }

      ssh.dispose();
    }
  });
}

module.exports = asyncModule;
module.exports.meta = require("./package.json");
